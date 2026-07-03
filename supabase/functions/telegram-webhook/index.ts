// Telegram bot webhook: linking + posts + orders + presets + inline callbacks
import { createClient } from "npm:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}
const reply = (chatId: number, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });

async function getLinkedUser(chatId: number) {
  const { data } = await supabase.from("telegram_engagement_links").select("user_id").eq("telegram_chat_id", chatId).eq("status", "linked").maybeSingle();
  return data?.user_id as string | undefined;
}

async function placeEngagement(user_id: string, link: string, views: number, likes: number, comments: number, drip_minutes = 0) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/instagram-place-engagement`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    body: JSON.stringify({ user_id, link, views, likes, comments, drip_minutes, source: "telegram" }),
  });
  return { ok: res.ok, ...(await res.json().catch(() => ({}))) };
}

async function findMediaByShortcode(userId: string, shortcode: string) {
  const { data } = await supabase.from("instagram_media").select("permalink,shortcode").eq("user_id", userId).eq("shortcode", shortcode).maybeSingle();
  return data;
}

async function handleCommand(chatId: number, username: string | null, text: string) {
  const [cmdRaw, ...args] = text.trim().split(/\s+/);
  const cmd = cmdRaw.split("@")[0].toLowerCase();

  if (cmd === "/start" || cmd === "/help") {
    return reply(chatId,
      `<b>OrganicSMM Pro Bot</b>\n\nCommands:\n<code>/link CODE</code> — pair account\n<code>/wallet</code> — balance\n<code>/posts</code> — recent IG posts\n<code>/orders</code> — recent orders\n<code>/cancel ID</code> — cancel pending\n\n<b>Defaults (auto-apply on /order)</b>\n<code>/setdefault VIEWS LIKES COMMENTS [DRIP_MIN]</code>\n<code>/setlink &lt;instagram-link&gt;</code>\n<code>/mode auto|manual</code>\n<code>/mydefaults</code> — show saved defaults\n<code>/cleardefaults</code> — remove saved link\n\n<b>Order</b>\n<code>/order</code> — use saved link + qty\n<code>/order &lt;link&gt;</code> — use saved qty\n<code>/order &lt;link&gt; V L C</code> — override\n\nGet CODE from app → More → Telegram Bot.`);
  }

  if (cmd === "/link") {
    const code = args[0];
    if (!code) return reply(chatId, "Usage: <code>/link YOURCODE</code>");
    const { data, error } = await supabase.rpc("redeem_telegram_link_code", { p_code: code, p_chat_id: chatId, p_username: username ?? "" });
    if (error) return reply(chatId, `❌ ${error.message}`);
    if (!data?.success) return reply(chatId, `❌ Link failed: ${data?.reason ?? "unknown"}`);
    return reply(chatId, "✅ Linked! Try /wallet or /posts.");
  }

  const userId = await getLinkedUser(chatId);
  if (!userId) return reply(chatId, "🔒 Not linked. App → More → Telegram Bot → copy code → <code>/link CODE</code>.");

  if (cmd === "/wallet") {
    const { data: w } = await supabase.from("wallets").select("balance,total_spent").eq("user_id", userId).maybeSingle();
    const inr = (v: number) => `₹${(v * 83.5).toFixed(2)}`;
    return reply(chatId, `💰 <b>Wallet</b>\nBalance: ${inr(Number(w?.balance ?? 0))}\nTotal Spent: ${inr(Number(w?.total_spent ?? 0))}`);
  }

  if (cmd === "/setdefault") {
    const [v, l, c, d] = args.map((n) => Math.max(0, Math.floor(Number(n) || 0)));
    if (args.length < 3) return reply(chatId, "Usage: <code>/setdefault VIEWS LIKES COMMENTS [DRIP_MIN]</code>\nExample: <code>/setdefault 5000 500 50 60</code>");
    const { error } = await supabase.from("engagement_presets").upsert({
      user_id: userId, views: v, likes: l, comments: c, drip_minutes: d || 0,
    });
    if (error) return reply(chatId, `❌ ${error.message}`);
    return reply(chatId, `✅ Default quantities saved.\nViews: ${v} · Likes: ${l} · Comments: ${c} · Drip: ${d || 0}m\n\nAb <code>/order</code> chalao — quantity auto-apply hogi.`);
  }

  if (cmd === "/setlink") {
    const link = args[0];
    if (!link) return reply(chatId, "Usage: <code>/setlink &lt;instagram-link&gt;</code>");
    if (!/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i.test(link)) {
      return reply(chatId, "❌ Invalid link. Must be an Instagram post/reel URL.");
    }
    if (link.length > 300) return reply(chatId, "❌ Link too long (max 300 chars).");
    const { error } = await supabase.from("engagement_presets").upsert({ user_id: userId, default_link: link });
    if (error) return reply(chatId, `❌ ${error.message}`);
    return reply(chatId, `✅ Default link saved.\n<code>${link}</code>\n\nAb <code>/order</code> sirf likhne se hi order lag jayega.`);
  }

  if (cmd === "/cleardefaults") {
    const { error } = await supabase.from("engagement_presets").upsert({ user_id: userId, default_link: null });
    if (error) return reply(chatId, `❌ ${error.message}`);
    return reply(chatId, "✅ Default link cleared. Quantities aur mode intact hain.");
  }

  if (cmd === "/mydefaults") {
    const { data: p } = await supabase.from("engagement_presets").select("*").eq("user_id", userId).maybeSingle();
    if (!p) return reply(chatId, "No defaults saved yet.\nUse <code>/setdefault</code>, <code>/setlink</code>, <code>/mode</code>.");
    return reply(chatId,
      `<b>Your defaults</b>\nMode: <code>${p.mode ?? "manual"}</code>\nLink: ${p.default_link ? `<code>${p.default_link}</code>` : "<i>(not set)</i>"}\nViews: ${p.views ?? 0} · Likes: ${p.likes ?? 0} · Comments: ${p.comments ?? 0}\nDrip: ${p.drip_minutes ?? 0}m`);
  }

  if (cmd === "/mode") {
    const m = (args[0] ?? "").toLowerCase();
    if (!["auto", "manual"].includes(m)) return reply(chatId, "Usage: <code>/mode auto</code> or <code>/mode manual</code>");
    const { error } = await supabase.from("engagement_presets").upsert({ user_id: userId, mode: m });
    if (error) return reply(chatId, `❌ ${error.message}`);
    return reply(chatId, `✅ Mode set to <b>${m}</b>.`);
  }

  if (cmd === "/order") {
    const usage = "Usage: <code>/order</code> (uses saved defaults)\n<code>/order &lt;link&gt;</code>\n<code>/order &lt;link&gt; VIEWS LIKES COMMENTS</code>\n\nSet defaults: <code>/setlink</code>, <code>/setdefault</code>";

    // Load preset once — used for defaults on link + quantities
    const { data: preset } = await supabase.from("engagement_presets").select("*").eq("user_id", userId).maybeSingle();

    // 1. Resolve link (arg or preset.default_link)
    let link = args[0];
    if (!link) {
      if (!preset?.default_link) {
        return reply(chatId, `❌ No link given and no default link saved.\nSet one with <code>/setlink &lt;instagram-link&gt;</code>.\n\n${usage}`);
      }
      link = preset.default_link as string;
    }
    if (!/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i.test(link)) {
      return reply(chatId, `❌ Invalid link. Must be an Instagram post/reel URL.`);
    }
    if (link.length > 300) return reply(chatId, "❌ Link too long (max 300 chars).");

    // 2. Quantities — inline overrides preset
    const raw = [args[1], args[2], args[3]];
    const provided = raw.some((x) => x !== undefined);
    const parseQty = (label: string, s: string | undefined): { val: number; err?: string } => {
      if (s === undefined || s === "") return { val: 0 };
      if (!/^\d+$/.test(s)) return { val: 0, err: `❌ ${label} must be a whole number (got "<code>${s}</code>").` };
      const n = Number(s);
      if (!Number.isFinite(n) || n < 0) return { val: 0, err: `❌ ${label} must be 0 or more.` };
      if (n > 1_000_000) return { val: 0, err: `❌ ${label} too high (max 1,000,000).` };
      return { val: n };
    };
    let v = 0, l = 0, c = 0;
    if (provided) {
      const pv = parseQty("Views", raw[0]);
      const pl = parseQty("Likes", raw[1]);
      const pc = parseQty("Comments", raw[2]);
      const err = pv.err || pl.err || pc.err;
      if (err) return reply(chatId, `${err}\n${usage}`);
      v = pv.val; l = pl.val; c = pc.val;
      if (v + l + c === 0) return reply(chatId, "❌ At least one of VIEWS / LIKES / COMMENTS must be greater than 0.");
    } else {
      if (!preset) return reply(chatId, "❌ No quantities given and no preset saved.\nSet one with <code>/setdefault VIEWS LIKES COMMENTS</code>.");
      v = Math.max(0, Math.floor(Number(preset.views) || 0));
      l = Math.max(0, Math.floor(Number(preset.likes) || 0));
      c = Math.max(0, Math.floor(Number(preset.comments) || 0));
      if (v + l + c === 0) return reply(chatId, "❌ Your preset has all zero quantities. Update it with <code>/setdefault VIEWS LIKES COMMENTS</code>.");
    }

    const drip = Math.max(0, Math.floor(Number(preset?.drip_minutes) || 0));
    const r = await placeEngagement(userId, link, v, l, c, drip);
    if (!r.ok) return reply(chatId, `❌ ${r.error ?? "Order failed"}`);
    return reply(chatId, `✅ Order <code>#${r.order_number}</code> placed\nLink: <code>${link}</code>\nViews:${v} Likes:${l} Comments:${c}${drip ? ` · Drip:${drip}m` : ""}\nCharged: ₹${r.charged_inr}`);
  }



  if (cmd === "/posts") {
    const { data: posts } = await supabase.rpc("get_posts_with_order_summary", { _user_id: userId });
    const rows = (posts ?? []).slice(0, 6);
    if (rows.length === 0) return reply(chatId, "No posts yet. Link IG in app.");
    for (const p of rows as any[]) {
      const kb = {
        inline_keyboard: [
          [{ text: "🚀 Apply preset", callback_data: `apply:${p.shortcode}:all` }],
          [{ text: "✏️ Custom", callback_data: `post:${p.shortcode}` }],
        ],
      };
      await reply(chatId, `<a href="${p.permalink}">${p.shortcode}</a>\n${p.active_orders} active / ${p.completed_orders} done`, { reply_markup: kb });
    }
    return;
  }

  if (cmd === "/orders") {
    const { data: orders } = await supabase.from("engagement_orders").select("id,order_number,link,status,total_price,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(8);
    if (!orders?.length) return reply(chatId, "No orders yet.");
    const list = orders.map((o: any) => `<code>#${o.order_number}</code> · ${o.status} · ₹${(Number(o.total_price) * 83.5).toFixed(2)}\n<a href="${o.link}">link</a>`).join("\n\n");
    return reply(chatId, `<b>Recent Orders</b>\n\n${list}`);
  }

  if (cmd === "/status") {
    const n = Number(args[0]);
    if (!n) return reply(chatId, "Usage: <code>/status ORDER_NUMBER</code>");
    const { data: o } = await supabase.from("engagement_orders").select("order_number,status,total_price,link").eq("user_id", userId).eq("order_number", n).maybeSingle();
    if (!o) return reply(chatId, "Not found.");
    return reply(chatId, `<b>Order #${o.order_number}</b>\nStatus: ${o.status}\nAmount: ₹${(Number(o.total_price) * 83.5).toFixed(2)}\n<a href="${o.link}">link</a>`);
  }

  if (cmd === "/cancel") {
    const n = Number(args[0]);
    if (!n) return reply(chatId, "Usage: <code>/cancel ORDER_NUMBER</code>");
    const { data: match } = await supabase.from("engagement_orders").select("id,status").eq("user_id", userId).eq("order_number", n).maybeSingle();
    if (!match) return reply(chatId, "Not found.");
    if (!["pending", "processing"].includes(match.status)) return reply(chatId, `Cannot cancel (status: ${match.status}).`);
    const { error } = await supabase.functions.invoke("cancel-order", { body: { engagement_order_id: match.id } });
    if (error) return reply(chatId, `❌ ${error.message}`);
    return reply(chatId, `✅ Cancel requested for #${n}. Refund not applicable on user cancels.`);
  }

  return reply(chatId, "Unknown command. Send /help.");
}

async function handleCallback(cq: any) {
  const chatId = cq.message?.chat?.id;
  const data = String(cq.data ?? "");
  if (!chatId) return;
  await tg("answerCallbackQuery", { callback_query_id: cq.id });

  const userId = await getLinkedUser(chatId);
  if (!userId) { await reply(chatId, "🔒 Not linked."); return; }

  // apply:<shortcode>:all → apply preset to that post
  if (data.startsWith("apply:")) {
    const [, shortcode] = data.split(":");
    const media = await findMediaByShortcode(userId, shortcode);
    if (!media) { await reply(chatId, "Post not found in your account."); return; }
    const { data: preset } = await supabase.from("engagement_presets").select("*").eq("user_id", userId).maybeSingle();
    if (!preset || (preset.views + preset.likes + preset.comments) === 0) {
      await reply(chatId, "No preset. Set with <code>/setdefault V L C [DRIP]</code>");
      return;
    }
    const r = await placeEngagement(userId, media.permalink, preset.views, preset.likes, preset.comments, preset.drip_minutes ?? 0);
    if (!r.ok) { await reply(chatId, `❌ ${r.error ?? "Order failed"}`); return; }
    await reply(chatId, `✅ Order <code>#${r.order_number}</code> placed on ${shortcode}\nCharged: ₹${r.charged_inr}`);
    return;
  }

  // post:<shortcode> → hint custom command
  if (data.startsWith("post:")) {
    const [, shortcode] = data.split(":");
    const media = await findMediaByShortcode(userId, shortcode);
    if (!media) { await reply(chatId, "Post not found."); return; }
    await reply(chatId, `Send: <code>/order ${media.permalink} VIEWS LIKES COMMENTS</code>`);
    return;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  try {
    const update = await req.json();
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else {
      const msg = update.message ?? update.edited_message;
      if (msg?.chat?.id && msg?.text) await handleCommand(msg.chat.id, msg.from?.username ?? null, msg.text);
    }
  } catch (e) {
    console.error("webhook error", e);
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
