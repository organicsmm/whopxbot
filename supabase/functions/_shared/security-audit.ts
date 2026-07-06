// Shared helper to record blocked/rejected security events into
// public.security_audit_log. Fire-and-forget: never throws so it can't break
// the calling handler.
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AuditCategory =
  | "webhook_forgery"
  | "webhook_replay"
  | "webhook_invalid_signature"
  | "webhook_unverified_status"
  | "webhook_missing_field"
  | "payment_gate_denied"
  | "rpc_denied"
  | "rls_denied";

export interface AuditEntry {
  category: AuditCategory;
  source: string;
  reason: string;
  provider?: string | null;
  order_id?: string | null;
  track_id?: string | null;
  user_id?: string | null;
  http_status?: number | null;
  request?: Request | null;
  payload?: any;
  metadata?: Record<string, unknown>;
}

export async function recordSecurityEvent(
  admin: SupabaseClient,
  entry: AuditEntry,
): Promise<void> {
  try {
    const req = entry.request;
    const ip =
      req?.headers.get("cf-connecting-ip") ||
      req?.headers.get("x-real-ip") ||
      req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;
    const ua = req?.headers.get("user-agent") || null;
    const path = req ? new URL(req.url).pathname : null;

    await admin.from("security_audit_log").insert({
      category: entry.category,
      source: entry.source,
      reason: entry.reason,
      provider: entry.provider ?? null,
      order_id: entry.order_id ?? null,
      track_id: entry.track_id ?? null,
      user_id: entry.user_id ?? null,
      http_status: entry.http_status ?? null,
      ip,
      user_agent: ua,
      request_path: path,
      payload: entry.payload ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (e) {
    console.error("[security-audit] insert failed", e);
  }
}
