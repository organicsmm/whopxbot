import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ZAPUPI_URL = "https://pay.zapupi.com/api/create-order";
const MIN_INR = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ZAP_KEY = Deno.env.get("ZAPUPI_ZAP_KEY");
    if (!ZAP_KEY) {
      return json({ error: "ZapUPI not configured" }, 500);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const amountInr = Math.floor(Number(body?.amount_inr) || 0);
    if (!amountInr || amountInr < MIN_INR) {
      return json({ error: `Minimum deposit is INR ${MIN_INR}` }, 400);
    }
    if (amountInr > 100000) {
      return json({ error: "Maximum deposit is INR 100000" }, 400);
    }

    const orderId = `zap_${user.id.slice(0, 8)}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    // Insert pending row first (so webhook can find it even if create-order returns slowly)
    const { error: insErr } = await supabase.from("zapupi_deposits").insert({
      user_id: user.id,
      order_id: orderId,
      amount_inr: amountInr,
      status: "pending",
    });
    if (insErr) {
      console.error("[zapupi-create-order] insert error", insErr);
      return json({ error: "Could not create deposit" }, 500);
    }

    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      "https://whopautopailot.site";

    const projectRef = Deno.env.get("SUPABASE_URL")!
      .replace("https://", "")
      .split(".")[0];
    const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/zapupi-webhook`;

    const payload = {
      key: ZAP_KEY,
      client_txn_id: orderId,
      amount: String(amountInr),
      p_info: "Wallet Top-up",
      customer_name: (user.email || "user").split("@")[0],
      customer_email: user.email || "user@example.com",
      customer_mobile: "9999999999",
      redirect_url: `${origin}/wallet?deposit=success&order_id=${orderId}`,
      webhook_url: webhookUrl,
      udf1: user.id,
      udf2: orderId,
      udf3: "wallet",
    };

    const upstream = await fetch(ZAPUPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const raw = await upstream.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { data = { raw }; }

    if (!upstream.ok || !(data?.status === true || data?.status === "true" || data?.success === true)) {
      console.error("[zapupi-create-order] upstream error", upstream.status, raw);
      await supabase.from("zapupi_deposits")
        .update({ status: "failed", raw_response: data })
        .eq("order_id", orderId);
      return json({ error: data?.message || "Payment provider error" }, 502);
    }

    const paymentUrl =
      data?.data?.payment_url ||
      data?.payment_url ||
      data?.result?.payment_url ||
      data?.data?.url ||
      data?.url;
    const upstreamOrder =
      data?.data?.order_id || data?.order_id || data?.data?.id || null;

    if (!paymentUrl) {
      console.error("[zapupi-create-order] no payment_url", data);
      await supabase.from("zapupi_deposits")
        .update({ status: "failed", raw_response: data })
        .eq("order_id", orderId);
      return json({ error: "No payment URL returned" }, 502);
    }

    await supabase.from("zapupi_deposits")
      .update({
        payment_url: paymentUrl,
        txn_id: upstreamOrder ? String(upstreamOrder) : null,
        raw_response: data,
      })
      .eq("order_id", orderId);

    return json({
      success: true,
      payment_url: paymentUrl,
      order_id: orderId,
      amount_inr: amountInr,
    });
  } catch (e: any) {
    console.error("[zapupi-create-order] error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
