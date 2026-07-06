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

    if (!orderId) {
      console.error("no order_id in webhook");
      return json({ ok: false, error: "missing order_id" }, 400);
    }

    // Find deposit
    const { data: dep, error: fetchErr } = await supabase
      .from("oxapay_deposits")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (fetchErr || !dep) {
      console.error("deposit not found", orderId, fetchErr);
      return json({ ok: false, error: "deposit not found" }, 404);
    }

    // Store webhook payload always
    await supabase.from("oxapay_deposits")
      .update({ webhook_payload: payload, track_id: trackId ? String(trackId) : dep.track_id })
      .eq("order_id", orderId);

    // Only credit on paid/confirmed
    const isPaid =
      status === "paid" ||
      status === "confirmed" ||
      status === "confirming" && paidAmount > 0 ? false : (status === "paid" || status === "confirmed");

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
