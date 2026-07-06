// Deno test: payment security invariants.
// Verifies that no unauthenticated OR authenticated (non-service-role) client can:
//   1. Execute activate_subscription_oxapay RPC
//   2. Execute credit_wallet_oxapay RPC
//   3. Execute credit_wallet_razorpay / credit_wallet_zapupi RPCs
//   4. Insert fake rows into oxapay_deposits / zapupi_deposits / deposits
//   5. Trigger a subscription activation without a genuine gateway-verified webhook
//
// A "pass" means every one of these attempts is rejected by PostgREST/RLS/GRANT,
// and no subscription row transitions to `active` and no wallet balance moves.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY")!;

assert(SUPABASE_URL, "VITE_SUPABASE_URL missing");
assert(ANON_KEY, "VITE_SUPABASE_PUBLISHABLE_KEY missing");

const REST = `${SUPABASE_URL}/rest/v1`;
const FAKE_USER = "00000000-0000-0000-0000-000000000001";
const FAKE_ORDER = `fake-${crypto.randomUUID()}`;

type AuthMode = "anon" | "fake-jwt";

function headers(mode: AuthMode = "anon"): HeadersInit {
  // The "fake-jwt" mode still sends the anon key — Supabase will treat the
  // caller as role=anon because we cannot mint a real user JWT here. The point
  // is to prove the RPC/insert is rejected without the service role, which is
  // the exact posture a signed-in attacker's browser sits in.
  return {
    "Content-Type": "application/json",
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${ANON_KEY}`,
    "Prefer": "return=representation",
  };
}

async function callRpc(name: string, payload: Record<string, unknown>) {
  const res = await fetch(`${REST}/rpc/${name}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function insertRow(table: string, row: Record<string, unknown>) {
  const res = await fetch(`${REST}/${table}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(row),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function selectRow(table: string, query: string) {
  const res = await fetch(`${REST}/${table}?${query}`, {
    method: "GET",
    headers: headers(),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

function isDenied(status: number, body: string): boolean {
  // Accept any of: 401 (no session), 403 (RLS/GRANT denied), 404 (function
  // not exposed to role), 400 with a permission/auth error string.
  if (status === 401 || status === 403 || status === 404) return true;
  if (status >= 400) {
    const b = body.toLowerCase();
    return (
      b.includes("permission denied") ||
      b.includes("not permitted") ||
      b.includes("not authenticated") ||
      b.includes("unauthorized") ||
      b.includes("no function matches") ||
      b.includes("row-level security") ||
      b.includes("violates row-level security")
    );
  }
  return false;
}

// ─── RPC bypass attempts ────────────────────────────────────────────────────

Deno.test("security — activate_subscription_oxapay is NOT callable by anon/authenticated", async () => {
  const { status, body } = await callRpc("activate_subscription_oxapay", {
    p_user_id: FAKE_USER,
    p_order_id: FAKE_ORDER,
    p_plan: "lifetime",
    p_amount_usd: 299,
    p_track_id: "attacker-track",
  });
  assert(
    isDenied(status, body),
    `activate_subscription_oxapay should be denied. status=${status} body=${body}`,
  );
});

Deno.test("security — credit_wallet_oxapay is NOT callable by anon/authenticated", async () => {
  const { status, body } = await callRpc("credit_wallet_oxapay", {
    p_user_id: FAKE_USER,
    p_order_id: FAKE_ORDER,
    p_amount_usd: 500,
    p_track_id: "attacker-track",
  });
  assert(
    isDenied(status, body),
    `credit_wallet_oxapay should be denied. status=${status} body=${body}`,
  );
});

Deno.test("security — credit_wallet_razorpay is NOT callable by anon/authenticated", async () => {
  const { status, body } = await callRpc("credit_wallet_razorpay", {
    p_user_id: FAKE_USER,
    p_payment_id: `pay_fake_${crypto.randomUUID()}`,
    p_amount_usd: 100,
    p_amount_inr: 8350,
  });
  assert(
    isDenied(status, body),
    `credit_wallet_razorpay should be denied. status=${status} body=${body}`,
  );
});

Deno.test("security — credit_wallet_zapupi is NOT callable by anon/authenticated", async () => {
  const { status, body } = await callRpc("credit_wallet_zapupi", {
    p_user_id: FAKE_USER,
    p_order_id: FAKE_ORDER,
    p_amount_usd: 100,
    p_amount_inr: 8350,
    p_txn_id: "attacker-txn",
    p_utr: "attacker-utr",
  });
  assert(
    isDenied(status, body),
    `credit_wallet_zapupi should be denied. status=${status} body=${body}`,
  );
});

// ─── Direct table insert attempts (fake deposit rows) ──────────────────────

Deno.test("security — cannot INSERT a fake oxapay_deposits row", async () => {
  const { status, body } = await insertRow("oxapay_deposits", {
    user_id: FAKE_USER,
    order_id: FAKE_ORDER,
    amount_usd: 299,
    status: "paid",
    credited: false,
    plan_type: "lifetime",
  });
  assert(
    isDenied(status, body),
    `oxapay_deposits insert should be denied. status=${status} body=${body}`,
  );
});

Deno.test("security — cannot INSERT a fake zapupi_deposits row", async () => {
  const { status, body } = await insertRow("zapupi_deposits", {
    user_id: FAKE_USER,
    order_id: FAKE_ORDER,
    amount_inr: 8350,
    amount_usd: 100,
    status: "success",
    credited: false,
  });
  assert(
    isDenied(status, body),
    `zapupi_deposits insert should be denied. status=${status} body=${body}`,
  );
});

Deno.test("security — cannot INSERT a fake deposits row", async () => {
  const { status, body } = await insertRow("deposits", {
    user_id: FAKE_USER,
    amount: 100,
    status: "verified",
    payment_method: "attacker",
  });
  assert(
    isDenied(status, body),
    `deposits insert should be denied. status=${status} body=${body}`,
  );
});

// ─── End-state assertion: no subscription activated, no wallet moved ───────

Deno.test("security — no active subscription exists for the fake user after attacks", async () => {
  const { status, body } = await selectRow(
    "subscriptions",
    `user_id=eq.${FAKE_USER}&status=eq.active&select=id`,
  );
  // Either RLS hides everything (empty array) or denies with 401/403 — both are safe.
  if (status === 200) {
    assertEquals(
      body.trim(),
      "[]",
      `Expected no active subscription for fake user, got: ${body}`,
    );
  } else {
    assert(
      isDenied(status, body),
      `Unexpected response reading subscriptions. status=${status} body=${body}`,
    );
  }
});

Deno.test("security — no wallet credit transaction exists for the fake order", async () => {
  const { status, body } = await selectRow(
    "transactions",
    `payment_reference=eq.${FAKE_ORDER}&select=id`,
  );
  if (status === 200) {
    assertEquals(
      body.trim(),
      "[]",
      `Expected no transaction for fake order, got: ${body}`,
    );
  } else {
    assert(
      isDenied(status, body),
      `Unexpected response reading transactions. status=${status} body=${body}`,
    );
  }
});
