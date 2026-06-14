// E2E invariant checker for the engagement order pipeline.
// Read-only. Admin-only (verifies caller has admin role).
// Returns pass/fail for:
//   1. bundle_items -> runs creation integrity
//   2. provider_order_id uniqueness
//   3. repeat dispatch prevention (started/completed runs without provider_order_id, dispatched runs with status=pending)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: must be admin (or bypass with x-invariant-key matching service role for CI)
    const authHeader = req.headers.get("Authorization");
    const ciKey = req.headers.get("x-invariant-key");
    let isAdmin = false;
    if (ciKey && ciKey === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      isAdmin = true;
    } else if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await admin.auth.getUser(token);
      if (user) {
        const { data: role } = await admin
          .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        isAdmin = !!role;
      }
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, any> = {};

    // ---- 1. bundle_items -> runs creation integrity ----
    // Every engagement_order_item must reference a service that exists in bundle_items
    // of the parent order's bundle, AND sum(runs.quantity_to_send) == item.quantity.
    const { data: items, error: itemsErr } = await admin
      .from("engagement_order_items")
      .select(`
        id, quantity, service_id, engagement_type, status,
        engagement_order:engagement_order_id ( id, bundle_id, status ),
        runs:organic_run_schedule ( id, quantity_to_send, status, provider_order_id )
      `)
      .in("status", ["pending", "processing", "completed", "partial"]);
    if (itemsErr) throw itemsErr;

    const { data: bundleItems, error: biErr } = await admin
      .from("bundle_items").select("bundle_id, service_id, engagement_type");
    if (biErr) throw biErr;
    const bundleMap = new Set(bundleItems!.map((b: any) => `${b.bundle_id}|${b.service_id}|${b.engagement_type}`));

    const mismatchedRunSum: any[] = [];
    const orphanedFromBundle: any[] = [];
    for (const it of items || []) {
      const eo: any = (it as any).engagement_order;
      if (eo?.bundle_id && !bundleMap.has(`${eo.bundle_id}|${it.service_id}|${it.engagement_type}`)) {
        orphanedFromBundle.push({ item_id: it.id, bundle_id: eo.bundle_id, service_id: it.service_id, engagement_type: it.engagement_type });
      }
      const sum = ((it as any).runs || []).reduce((a: number, r: any) => a + (r.quantity_to_send || 0), 0);
      // Only enforce when item is fully scheduled (has runs)
      if (((it as any).runs || []).length > 0 && sum !== it.quantity) {
        mismatchedRunSum.push({ item_id: it.id, item_qty: it.quantity, runs_sum: sum });
      }
    }
    results.bundle_runs_integrity = {
      pass: mismatchedRunSum.length === 0 && orphanedFromBundle.length === 0,
      items_checked: items?.length || 0,
      mismatched_run_sum: mismatchedRunSum.slice(0, 10),
      mismatched_count: mismatchedRunSum.length,
      orphaned_from_bundle: orphanedFromBundle.slice(0, 10),
      orphaned_count: orphanedFromBundle.length,
    };

    // ---- 2. provider_order_id uniqueness ----
    const { data: dupes, error: dupErr } = await admin.rpc("__noop_does_not_exist__" as any).then(
      () => ({ data: null, error: null }),
      () => ({ data: null, error: null }),
    );
    // RPC fallback: fetch all non-null IDs and detect dupes in JS.
    const { data: pids, error: pidsErr } = await admin
      .from("organic_run_schedule")
      .select("provider_order_id, id, status, engagement_order_item_id")
      .not("provider_order_id", "is", null);
    if (pidsErr) throw pidsErr;
    const seen = new Map<string, any[]>();
    for (const r of pids || []) {
      const k = String((r as any).provider_order_id);
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k)!.push(r);
    }
    const duplicates = [...seen.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => ({ provider_order_id: k, runs: v }));
    results.provider_order_id_unique = {
      pass: duplicates.length === 0,
      total_dispatched: pids?.length || 0,
      duplicates: duplicates.slice(0, 10),
      duplicate_count: duplicates.length,
    };

    // ---- 3. repeat dispatch prevention invariants ----
    // (a) status in ('completed','started') => provider_order_id must NOT be null
    //     (unless explicitly marked dispatch-uncertain)
    // (b) status='pending' => provider_order_id must be null (otherwise we'd re-send a dispatched run)
    const { data: badStarted, error: bsErr } = await admin
      .from("organic_run_schedule")
      .select("id, status, provider_order_id, error_message")
      .in("status", ["completed", "started"])
      .is("provider_order_id", null);
    if (bsErr) throw bsErr;
    const filteredBadStarted = (badStarted || []).filter((r: any) => {
      const msg = (r.error_message || "").toLowerCase();
      return !msg.includes("[dispatch uncertain]") && !msg.includes("[awaiting provider confirmation]");
    });

    const { data: badPending, error: bpErr } = await admin
      .from("organic_run_schedule")
      .select("id, status, provider_order_id")
      .eq("status", "pending")
      .not("provider_order_id", "is", null);
    if (bpErr) throw bpErr;

    results.repeat_dispatch_prevention = {
      pass: filteredBadStarted.length === 0 && (badPending?.length || 0) === 0,
      started_or_completed_without_provider_id: filteredBadStarted.slice(0, 10),
      started_or_completed_without_provider_id_count: filteredBadStarted.length,
      pending_with_provider_id: (badPending || []).slice(0, 10),
      pending_with_provider_id_count: badPending?.length || 0,
    };

    const allPass = Object.values(results).every((r: any) => r.pass);
    return new Response(JSON.stringify({ pass: allPass, results }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
