// Deno test: end-to-end invariants for the engagement order pipeline.
// Run via: lovable test_edge_functions (uses anon key from .env via dotenv).
// Auth: uses service-role key as an internal `x-invariant-key` header so the test
// can run without a logged-in admin user.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;

async function callInvariants() {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/e2e-invariants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON_KEY,
      "x-invariant-key": SERVICE_KEY,
    },
  });
  const body = await res.json();
  return { status: res.status, body };
}

Deno.test("e2e — bundle_items map to runs with matching quantities", async () => {
  const { status, body } = await callInvariants();
  assertEquals(status, 200, `function returned ${status}: ${JSON.stringify(body)}`);
  const r = body.results.bundle_runs_integrity;
  assert(
    r.pass,
    `bundle/runs integrity failed:\n  orphaned: ${JSON.stringify(r.orphaned_from_bundle)}\n  mismatched qty: ${JSON.stringify(r.mismatched_run_sum)}`,
  );
});

Deno.test("e2e — provider_order_id is unique across all runs", async () => {
  const { body } = await callInvariants();
  const r = body.results.provider_order_id_unique;
  assert(
    r.pass,
    `${r.duplicate_count} duplicate provider_order_id(s):\n${JSON.stringify(r.duplicates, null, 2)}`,
  );
});

Deno.test("e2e — no repeat dispatch (no pending row holds a provider_order_id; no started/completed row lacks one)", async () => {
  const { body } = await callInvariants();
  const r = body.results.repeat_dispatch_prevention;
  assert(
    r.pass,
    `repeat-dispatch invariants violated:\n  pending+provider_id: ${r.pending_with_provider_id_count} -> ${JSON.stringify(r.pending_with_provider_id)}\n  started/completed without provider_id: ${r.started_or_completed_without_provider_id_count} -> ${JSON.stringify(r.started_or_completed_without_provider_id)}`,
  );
});
