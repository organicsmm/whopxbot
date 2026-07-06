import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const OXAPAY_INFO = "https://api.oxapay.com/v1/payment/";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const API_KEY = Deno.env.get("OXAPAY_MERCHANT_API_KEY");
    if (!API_KEY) return json({ error: "OxaPay not configured" }, 500);

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
    const orderId = String(body?.order_id || "").trim();
    if (!orderId) return json({ error: "order_id required" }, 400);

    const { data: dep, error: fErr } = await supabase
      .from("oxapay_deposits")
      .select("*")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fErr || !dep) return json({ error: "deposit not found" }, 404);

    if (dep.credited) return json({ credited: true, status: "success" });

    // Try to fetch invoice details from OxaPay
    if (dep.track_id) {
      const resp = await fetch(`${OXAPAY_INFO}${dep.track_id}`, {
        headers: { "merchant_api_key": API_KEY },
      });
      const raw = await resp.text();
      let data: any = null;
      try { data = JSON.parse(raw); } catch { data = { raw }; }
      const inner = data?.data || data;
      const status = String(inner?.status || "").toLowerCase();

      if (status === "paid" || status === "confirmed") {
        // Credit now
        if (dep.purpose === "wallet") {
          await supabase.rpc("credit_wallet_oxapay", {
            p_user_id: dep.user_id,
            p_order_id: orderId,
            p_amount_usd: Number(dep.amount_usd),
            p_track_id: dep.track_id,
          });
        } else if (dep.purpose === "subscription") {
          await supabase.rpc("activate_subscription_oxapay", {
            p_user_id: dep.user_id,
            p_order_id: orderId,
            p_plan: dep.plan_type,
            p_amount_usd: Number(dep.amount_usd),
            p_track_id: dep.track_id,
          });
        }
        return json({ credited: true, status: "success" });
      }
      if (status === "expired") {
        await supabase.from("oxapay_deposits").update({ status: "expired" }).eq("order_id", orderId);
        return json({ status: "failed" });
      }
      return json({ status: "pending", provider_status: status });
    }

    return json({ status: dep.status });
  } catch (e: any) {
    console.error("oxapay-sync-deposit error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
