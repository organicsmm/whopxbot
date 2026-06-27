import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

const STATUS_URL = "https://pay.zapupi.com/api/order-status";
const USD_RATE = 83.5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Always 200 to webhook caller — never let provider retry on our internal errors
  try {
    const ZAP_KEY = Deno.env.get("ZAPUPI_ZAP_KEY");
    if (!ZAP_KEY) return ok({ received: true, note: "no key" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Accept form or JSON
    let payload: Record<string, any> = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      payload = await req.json().catch(() => ({}));
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [k, v] of params) payload[k] = v;
      if (Object.keys(payload).length === 0) {
        try { payload = JSON.parse(text); } catch {/*noop*/}
      }
    }

    console.log("[zapupi-webhook] received", JSON.stringify(payload).slice(0, 500));

    const orderId =
      payload.user_token ||
      payload.order_id ||
      payload.remark2 ||
      payload.client_txn_id ||
      payload.data?.user_token ||
      payload.data?.order_id;

    if (!orderId) {
      console.warn("[zapupi-webhook] no order id in payload");
      return ok({ received: true });
    }

    const { data: deposit } = await supabase
      .from("zapupi_deposits")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (!deposit) {
      console.warn("[zapupi-webhook] deposit not found for", orderId);
      return ok({ received: true });
    }

    if (deposit.credited) {
      return ok({ received: true, already_credited: true });
    }

    // Double-confirm with provider order-status API
    const verified = await verifyOrder(ZAP_KEY, orderId, payload);

    if (!verified.success) {
      if (verified.failed) {
        await supabase.from("zapupi_deposits")
          .update({ status: "failed", raw_response: verified.raw })
          .eq("order_id", orderId);
      }
      return ok({ received: true, verified: false });
    }

    const inr = Number(verified.amount || deposit.amount_inr) || Number(deposit.amount_inr);
    const usd = Number((inr / USD_RATE).toFixed(4));

    const { error: rpcErr } = await supabase.rpc("credit_wallet_zapupi", {
      p_user_id: deposit.user_id,
      p_order_id: orderId,
      p_amount_usd: usd,
      p_amount_inr: inr,
      p_txn_id: verified.txnId || deposit.txn_id || null,
      p_utr: verified.utr || null,
    });

    if (rpcErr) {
      console.error("[zapupi-webhook] credit rpc error", rpcErr);
    }

    return ok({ received: true, credited: !rpcErr });
  } catch (e: any) {
    console.error("[zapupi-webhook] error", e);
    return ok({ received: true, error: e?.message });
  }
});

async function verifyOrder(
  zapKey: string,
  orderId: string,
  fallbackPayload: Record<string, any>
): Promise<{ success: boolean; failed?: boolean; amount?: number; txnId?: string; utr?: string; raw?: any }> {
  try {
    const params = new URLSearchParams();
    params.set("zap_key", zapKey);
    params.set("user_token", orderId);
    params.set("client_txn_id", orderId);
    const resp = await fetch(STATUS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const raw = await resp.text();
    let data: any = null;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    console.log("[zapupi-webhook] verify resp", resp.status, raw.slice(0, 300));

    const node = data?.data || data?.result || data;
    const statusStr = String(
      node?.status || node?.payment_status || node?.txn_status || data?.status || ""
    ).toLowerCase();

    const isSuccess =
      statusStr === "success" ||
      statusStr === "completed" ||
      statusStr === "paid" ||
      statusStr === "settlement" ||
      data?.success === true ||
      node?.success === true;

    const isFailed =
      statusStr === "failed" || statusStr === "failure" || statusStr === "expired";

    if (isSuccess) {
      return {
        success: true,
        amount: Number(node?.amount || node?.txn_amount || fallbackPayload.amount),
        txnId: node?.utr || node?.txn_id || node?.upi_txn_id || fallbackPayload.txn_id,
        utr: node?.utr || node?.bank_ref || fallbackPayload.utr,
        raw: data,
      };
    }
    return { success: false, failed: isFailed, raw: data };
  } catch (e) {
    console.error("[zapupi-webhook] verify error", e);
    return { success: false };
  }
}

function ok(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
