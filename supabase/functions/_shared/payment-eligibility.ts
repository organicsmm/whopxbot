// Shared payment-eligibility gate used by every order-placement edge function.
//
// A user may place orders ONLY if one of the following is true:
//   1. They are an admin (user_roles.role = 'admin').
//   2. They have an ACTIVE, VERIFIED subscription:
//        - subscriptions.status = 'active'
//        - plan_type ∈ ('monthly', 'yearly', 'lifetime')  (never 'trial' / 'none')
//        - expires_at IS NULL OR expires_at > now()
//      Every active row was written by a service-role webhook after the
//      provider verified the payment — end users cannot INSERT/UPDATE this
//      table (RLS + GRANTs restrict it to service_role).
//   3. They have at least ONE fully verified deposit — a completed transaction
//      of type='deposit' whose payment_method is a real gateway
//      ('oxapay', 'razorpay_auto', 'zapupi'). Promo / referral / manual
//      credits do NOT count as "verified payment" for placement eligibility.
//
// Any other user (fresh account, promo-only wallet, expired sub) is blocked
// with a 403 before we touch the wallet or the orders tables.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type PaymentEligibility =
  | { ok: true; reason: "admin" | "subscription" | "verified_deposit" }
  | { ok: false; status: 403; error: string };

const VERIFIED_GATEWAYS = ["oxapay", "razorpay_auto", "zapupi"];
const VALID_ACTIVE_PLANS = ["monthly", "yearly", "lifetime"];

export async function assertPaymentEligible(
  admin: SupabaseClient,
  userId: string,
): Promise<PaymentEligibility> {
  if (!userId) {
    return { ok: false, status: 403, error: "Not authenticated" };
  }

  // 1. Admin bypass
  const { data: adminRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (adminRow) return { ok: true, reason: "admin" };

  // 2. Active, verified subscription
  const { data: sub } = await admin
    .from("subscriptions")
    .select("status, plan_type, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (sub && sub.status === "active" && VALID_ACTIVE_PLANS.includes(String(sub.plan_type))) {
    const notExpired = !sub.expires_at || new Date(sub.expires_at).getTime() > Date.now();
    if (notExpired) return { ok: true, reason: "subscription" };
  }

  // 3. At least one completed deposit from a real payment gateway
  const { data: verifiedDeposit } = await admin
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "deposit")
    .eq("status", "completed")
    .in("payment_method", VERIFIED_GATEWAYS)
    .limit(1)
    .maybeSingle();

  if (verifiedDeposit) return { ok: true, reason: "verified_deposit" };

  return {
    ok: false,
    status: 403,
    error:
      "Payment required: activate a subscription or make a verified deposit before placing orders.",
  };
}
