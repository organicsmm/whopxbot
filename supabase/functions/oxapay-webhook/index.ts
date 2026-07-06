import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, hmac",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const raw = await req.text();
    let payload: any = null;
    try { payload = JSON.parse(raw); } catch { payload = { raw }; }

    console.log("[oxapay-webhook] payload:", JSON.stringify(payload).slice(0, 800));

    // OxaPay v1 webhook fields (fallback across variants)
    const inner = payload?.data || payload;
    const orderId: string | undefined =
      inner?.order_id || inner?.orderId || payload?.order_id;
    const trackId: string | undefined =
      inner?.track_id || inner?.trackId || payload?.track_id;
    const status = String(inner?.status || payload?.status || "").toLowerCase();
    const paidAmount = Number(inner?.paid_amount ?? inner?.paidAmount ?? inner?.amount ?? 0);
    const payerEmail: string | undefined =
      inner?.email || inner?.payer_email || payload?.email || inner?.buyer_email;

    if (!orderId) {
      console.error("no order_id in webhook");
      return json({ ok: false, error: "missing order_id" }, 400);
    }

    // Find deposit
    let { data: dep, error: fetchErr } = await supabase
      .from("oxapay_deposits")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    // Fallback: static payment link (no deposit row). Auto-create using email → user match.
    if ((!dep || !dep.user_id) && (status === "paid" || status === "confirmed") && payerEmail) {
      const amt = paidAmount || 0;
      // Match amount → plan (small tolerance)
      const plans: Array<{ plan: string; usd: number }> = [
        { plan: "monthly", usd: 15 },
        { plan: "yearly", usd: 99 },
        { plan: "lifetime", usd: 250 },
      ];
      const matched = plans.find((p) => Math.abs(amt - p.usd) <= Math.max(1, p.usd * 0.05));
      if (!matched) {
        console.error("static-link: no plan matches amount", amt);
        return json({ ok: false, error: "amount does not match any plan" }, 400);
      }

      // Find user by email
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, email")
        .ilike("email", payerEmail.trim())
        .maybeSingle();

      if (!prof?.user_id) {
        console.error("static-link: user not found for email", payerEmail);
        // Still store an unlinked deposit for admin visibility
        await supabase.from("oxapay_deposits").upsert({
          order_id: orderId,
          purpose: "subscription",
          plan_type: matched.plan,
          amount_usd: matched.usd,
          email: payerEmail,
          track_id: trackId ? String(trackId) : null,
          webhook_payload: payload,
          status: "unmatched_email",
          credited: false,
        }, { onConflict: "order_id" });
        return json({ ok: false, error: "user email not found" }, 404);
      }

      // Upsert a deposit row so activate RPC works
      const { data: upserted, error: upErr } = await supabase.from("oxapay_deposits").upsert({
        order_id: orderId,
        user_id: prof.user_id,
        purpose: "subscription",
        plan_type: matched.plan,
        amount_usd: matched.usd,
        email: payerEmail,
        track_id: trackId ? String(trackId) : null,
        webhook_payload: payload,
        status: "paid",
        credited: false,
      }, { onConflict: "order_id" }).select("*").maybeSingle();

      if (upErr || !upserted) {
        console.error("static-link: upsert failed", upErr);
        return json({ ok: false, error: upErr?.message || "upsert failed" }, 500);
      }
      dep = upserted;
    }

    if (fetchErr || !dep) {
      console.error("deposit not found", orderId, fetchErr);
      return json({ ok: false, error: "deposit not found" }, 404);
    }

    // Store webhook payload always
    await supabase.from("oxapay_deposits")
      .update({ webhook_payload: payload, track_id: trackId ? String(trackId) : dep.track_id })
      .eq("order_id", orderId);

    if (status === "expired") {
      await supabase.from("oxapay_deposits").update({ status: "expired" }).eq("order_id", orderId);
      return json({ ok: true, status: "expired" });
    }

    if (!(status === "paid" || status === "confirmed")) {
      // waiting / confirming
      return json({ ok: true, status });
    }

    if (dep.credited) {
      return json({ ok: true, duplicate: true });
    }

    // Amount safety: use dep.amount_usd (declared at creation)
    const creditUsd = Number(dep.amount_usd);

    if (dep.purpose === "wallet") {
      const { data: res, error: rpcErr } = await supabase.rpc("credit_wallet_oxapay", {
        p_user_id: dep.user_id,
        p_order_id: orderId,
        p_amount_usd: creditUsd,
        p_track_id: trackId || null,
      });
      if (rpcErr) {
        console.error("credit_wallet_oxapay err", rpcErr);
        return json({ ok: false, error: rpcErr.message }, 500);
      }
      return json({ ok: true, result: res });
    }

    if (dep.purpose === "subscription") {
      const { data: res, error: rpcErr } = await supabase.rpc("activate_subscription_oxapay", {
        p_user_id: dep.user_id,
        p_order_id: orderId,
        p_plan: dep.plan_type,
        p_amount_usd: creditUsd,
        p_track_id: trackId || null,
      });
      if (rpcErr) {
        console.error("activate_subscription_oxapay err", rpcErr);
        return json({ ok: false, error: rpcErr.message }, 500);
      }
      return json({ ok: true, result: res });
    }

    return json({ ok: true, ignored: true });
  } catch (e: any) {
    console.error("oxapay-webhook error", e);
    return json({ ok: false, error: e?.message || "Internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
