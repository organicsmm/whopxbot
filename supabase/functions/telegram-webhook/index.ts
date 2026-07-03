// Telegram bot webhook: handles /start, /link CODE, /wallet, /posts, /orders, /cancel, /help
import { createClient } from "npm:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function reply(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  return tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
}

async function getLinkedUser(chatId: number) {
  const { data } = await supabase
    .from("telegram_engagement_links")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .eq("status", "linked")
    .maybeSingle();
  return data?.user_id as string | undefined;
}

async function handleCommand(chatId: number, username: string | null, text: string) {
  const [cmdRaw, ...args] = text.trim().split(/\s+/);
  const cmd = cmdRaw.split("@")[0].toLowerCase();

  if (cmd === "/start" || cmd === "/help") {
    return reply(
      chatId,
      `<b>OrganicSMM Pro Bot</b>\n\nCommands:\n/link CODE — pair this chat with your account\n/wallet — wallet balance\n/posts — list your recent Instagram posts\n/orders — recent orders\n/cancel ORDER_ID — cancel a pending order\n\nGet your CODE from the app: <b>More → Telegram Bot</b>.`,
    );
  }

  if (cmd === "/link") {
    const code = args[0];
    if (!code) return reply(chatId, "Usage: <code>/link YOURCODE</code>");
    const { data, error } = await supabase.rpc("redeem_telegram_link_code", {
      p_code: code,
      p_chat_id: chatId,
      p_username: username ?? "",
    });
    if (error) return reply(chatId, `❌ ${error.message}`);
    if (!data?.success) return reply(chatId, `❌ Link failed: ${data?.reason ?? "unknown"}`);
    return reply(chatId, "✅ Linked! Try /wallet or /posts.");
  }

  const userId = await getLinkedUser(chatId);
  if (!userId) {
    return reply(chatId, "🔒 This chat is not linked yet. Open the app → <b>More → Telegram Bot</b>, copy the code, then send <code>/link CODE</code> here.");
  }

  if (cmd === "/wallet") {
    const { data: w } = await supabase.from("wallets").select("balance,total_spent").eq("user_id", userId).maybeSingle();
    const bal = Number(w?.balance ?? 0);
    const spent = Number(w?.total_spent ?? 0);
    const inr = (v: number) => `₹${(v * 83.5).toFixed(2)}`;
    return reply(chatId, `💰 <b>Wallet</b>\nBalance: ${inr(bal)}\nTotal Spent: ${inr(spent)}`);
  }

  if (cmd === "/posts") {
    const { data: posts } = await supabase.rpc("get_posts_with_order_summary", { _user_id: userId });
    const rows = (posts ?? []).slice(0, 8);
    if (rows.length === 0) return reply(chatId, "No Instagram posts imported yet. Link IG account in the app.");
    const list = rows.map((p: any, i: number) =>
      `${i + 1}. <a href="${p.permalink}">${p.shortcode}</a> — ${p.active_orders} active / ${p.completed_orders} done`,
    ).join("\n");
    return reply(chatId, `<b>Your Posts</b>\n${list}`);
  }

  if (cmd === "/orders") {
    const { data: orders } = await supabase
      .from("engagement_orders")
      .select("id,link,status,total_price,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);
    if (!orders?.length) return reply(chatId, "No engagement orders yet.");
    const list = orders.map((o: any) =>
      `<code>${o.id.slice(0, 8)}</code> · ${o.status} · ₹${(Number(o.total_price) * 83.5).toFixed(2)}\n<a href="${o.link}">link</a>`,
    ).join("\n\n");
    return reply(chatId, `<b>Recent Orders</b>\n\n${list}`);
  }

  if (cmd === "/cancel") {
    const idPrefix = args[0];
    if (!idPrefix) return reply(chatId, "Usage: <code>/cancel ORDER_ID_PREFIX</code>");
    const { data: match } = await supabase
      .from("engagement_orders")
      .select("id,status")
      .eq("user_id", userId)
      .ilike("id", `${idPrefix}%`)
      .maybeSingle();
    if (!match) return reply(chatId, "Order not found.");
    if (!["pending", "processing"].includes(match.status)) return reply(chatId, `Cannot cancel (status: ${match.status}).`);
    const { error } = await supabase.functions.invoke("cancel-order", { body: { engagement_order_id: match.id } });
    if (error) return reply(chatId, `❌ ${error.message}`);
    return reply(chatId, `✅ Cancel requested for ${match.id.slice(0, 8)}.`);
  }

  return reply(chatId, "Unknown command. Send /help.");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  try {
    const update = await req.json();
    const msg = update.message ?? update.edited_message;
    if (msg?.chat?.id && msg?.text) {
      await handleCommand(msg.chat.id, msg.from?.username ?? null, msg.text);
    }
  } catch (e) {
    console.error("webhook error", e);
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
