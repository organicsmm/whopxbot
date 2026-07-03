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

type Limit = { min: number; max: number };
async function getIgServiceLimits(): Promise<{ limits: Record<string, Limit>; err?: string }> {
  const { data: bundle, error: bErr } = await supabase
    .from("engagement_bundles")
    .select("id,bundle_items(engagement_type,service_id)")
    .eq("platform", "instagram").eq("is_active", true).maybeSingle();
  if (bErr) return { limits: {}, err: `bundle load failed: ${bErr.message}` };
  if (!bundle) return { limits: {}, err: "Instagram bundle not configured" };
  const items = ((bundle as any).bundle_items ?? []) as Array<{ engagement_type: string; service_id: string }>;
  const ids = items.map((i) => i.service_id).filter(Boolean);
  if (!ids.length) return { limits: {}, err: "Instagram bundle has no services" };
  const { data: svcs, error: sErr } = await supabase
    .from("services").select("id,min_quantity,max_quantity").in("id", ids);
  if (sErr) return { limits: {}, err: `service load failed: ${sErr.message}` };
  const byId = new Map((svcs ?? []).map((s: any) => [s.id, s]));
  const limits: Record<string, Limit> = {};
  for (const it of items) {
    const s: any = byId.get(it.service_id);
    if (!s) continue;
    limits[it.engagement_type] = {
      min: Math.max(0, Number(s.min_quantity) || 0),
      max: Math.max(1, Number(s.max_quantity) || 1_000_000),
    };
  }
  return { limits };
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
      `<b>OrganicSMM Pro Bot</b>\n\n` +
      `<b>Account</b>\n` +
      `<code>/link CODE</code> — pair account\n` +
      `<code>/wallet</code> — balance\n` +
      `<code>/posts</code> — recent IG posts\n` +
      `<code>/orders</code> — recent orders\n` +
      `<code>/cancel ID</code> — cancel pending order\n\n` +
      `<b>Defaults (auto-apply on /order)</b>\n` +
      `<code>/setlink &lt;instagram-link&gt;</code> — default post link\n` +
      `<code>/setdefault VIEWS LIKES COMMENTS [DRIP_MIN]</code> — default quantities\n` +
      `<code>/mode auto|manual</code> — auto-order on new posts\n` +
      `<code>/mydefaults</code> — show saved defaults\n` +
      `<code>/cleardefaults</code> — remove saved link\n\n` +
      `<b>/order — Place an engagement order</b>\n` +
      `Allowed formats:\n` +
      `1. <code>/order</code>\n` +
      `   → uses saved link + saved quantities\n` +
      `2. <code>/order &lt;link&gt;</code>\n` +
      `   → uses saved quantities on given link\n` +
      `3. <code>/order &lt;link&gt; VIEWS LIKES COMMENTS</code>\n` +
      `   → full override (any qty can be 0)\n` +
      `4. <code>/order &lt;link&gt; VIEWS LIKES COMMENTS DRIP_MIN</code>\n` +
      `   → override + drip-feed over N minutes\n\n` +
      `<b>Examples</b>\n` +
      `<code>/order</code>\n` +
      `<code>/order https://instagram.com/p/ABC123/</code>\n` +
      `<code>/order https://instagram.com/reel/XYZ/ 5000 500 50</code>\n` +
      `<code>/order https://instagram.com/p/ABC/ 10000 0 0 60</code>\n\n` +
      `<b>Rules</b>\n` +
      `• Link must be an Instagram post/reel URL\n` +
      `• Each quantity: 0 – 1,000,000 (at least one &gt; 0)\n` +
      `• DRIP_MIN optional: 0 = instant, up to 1440 (24h)\n\n` +
      `Get CODE from app → More → Telegram Bot.`);
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
    const EX_FULL = "/order https://instagram.com/p/ABC123/ 5000 500 50";
    // Consistent error formatter: emoji header + bullet lines
    const orderErr = (o: {
      icon?: string; title: string; problem?: string; fix?: string; example?: string; extra?: string;
    }) => {
      const lines = [`${o.icon ?? "❌"} <b>${o.title}</b>`];
      if (o.problem) lines.push(`• <b>Problem:</b> ${o.problem}`);
      if (o.fix) lines.push(`• <b>Fix:</b> ${o.fix}`);
      if (o.example) lines.push(`• <b>Example:</b> <code>${o.example}</code>`);
      if (o.extra) lines.push(o.extra);
      return reply(chatId, lines.join("\n"));
    };

    // Reject too many args early so users don't silently drop values
    if (args.length > 5) {
      return orderErr({
        title: "Too many arguments",
        problem: `You sent ${args.length} arguments (max 5: link + views + likes + comments + drip).`,
        fix: "Remove extras or wrap the link if it has spaces.",
        example: EX_FULL,
      });
    }

    // Load preset once — used for defaults on link + quantities
    const { data: preset, error: presetErr } = await supabase
      .from("engagement_presets").select("*").eq("user_id", userId).maybeSingle();
    if (presetErr) return orderErr({
      title: "Could not load your saved defaults",
      problem: presetErr.message,
      fix: "Try again in a few seconds. If it persists, contact support.",
    });

    // ---------- 1. Resolve + validate LINK ----------
    let link = args[0];
    let linkSource: "arg" | "preset" = "arg";
    if (!link) {
      if (!preset?.default_link) {
        return orderErr({
          title: "No link given and no default link saved",
          problem: "Bot doesn't know which post to boost.",
          fix: "Save a default with <code>/setlink &lt;instagram-link&gt;</code>, or pass one inline.",
          example: "/order https://instagram.com/p/ABC123/",
        });
      }
      link = preset.default_link as string;
      linkSource = "preset";
    }

    // strip common wrapping chars
    link = link.trim().replace(/^[<"']|[>"']$/g, "");

    if (link.length > 300) {
      return orderErr({
        title: "Link too long",
        problem: `${link.length} chars (max 300).`,
        fix: "Copy the URL directly from Instagram — remove tracking/query suffix.",
        example: "https://instagram.com/p/ABC123/",
      });
    }

    let parsedUrl: URL;
    try { parsedUrl = new URL(link); }
    catch {
      return orderErr({
        title: "Link is not a valid URL",
        problem: `Could not parse: <code>${link}</code>`,
        fix: "Must start with <code>https://</code> and be a full Instagram post/reel URL.",
        example: "https://instagram.com/p/ABC123/",
      });
    }

    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return orderErr({
        title: "Link must use https://",
        problem: `Got protocol <code>${parsedUrl.protocol}</code>.`,
        fix: "Use the standard https Instagram URL.",
        example: "https://instagram.com/p/ABC123/",
      });
    }
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "instagram.com") {
      return orderErr({
        title: "Only Instagram links are supported",
        problem: `Got host <code>${host}</code>.`,
        fix: "Use a public instagram.com post/reel URL.",
        example: "https://instagram.com/p/ABC123/",
      });
    }
    const pathMatch = parsedUrl.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})\/?/);
    if (!pathMatch) {
      return orderErr({
        title: "Not a post/reel URL",
        problem: `Path <code>${parsedUrl.pathname}</code> doesn't match a post/reel.`,
        fix: "Path must be <code>/p/&lt;code&gt;/</code>, <code>/reel/&lt;code&gt;/</code> or <code>/tv/&lt;code&gt;/</code>.",
        example: "https://instagram.com/reel/XYZ456/",
      });
    }
    // normalize link to canonical form (drops query string / fbclid etc.)
    link = `https://instagram.com/${pathMatch[1]}/${pathMatch[2]}/`;

    // ---------- 2. Resolve + validate QUANTITIES ----------
    const raw = [args[1], args[2], args[3]];
    const provided = raw.some((x) => x !== undefined);
    const parseQty = (label: string, s: string | undefined): { val: number; err?: { title: string; problem: string; fix: string } } => {
      if (s === undefined || s === "") return { val: 0 };
      if (!/^\d+$/.test(s)) return { val: 0, err: {
        title: `${label} is not a whole number`,
        problem: `Got "<code>${s}</code>".`,
        fix: "Use digits only — no commas, decimals, k/M, or letters.",
      }};
      const n = Number(s);
      if (!Number.isFinite(n) || n < 0) return { val: 0, err: {
        title: `${label} must be 0 or more`,
        problem: `Got "<code>${s}</code>".`,
        fix: "Use 0 to skip this engagement type.",
      }};
      if (n > 1_000_000) return { val: 0, err: {
        title: `${label} too high`,
        problem: `${n.toLocaleString()} exceeds cap.`,
        fix: "Max 1,000,000 per field. Split into multiple orders if needed.",
      }};
      return { val: n };
    };
    let v = 0, l = 0, c = 0;
    let qtySource: "arg" | "preset" = "arg";
    if (provided) {
      const missing: string[] = [];
      if (raw[0] === undefined) missing.push("VIEWS");
      if (raw[1] === undefined) missing.push("LIKES");
      if (raw[2] === undefined) missing.push("COMMENTS");
      if (missing.length) {
        return orderErr({
          title: "Missing quantity value(s)",
          problem: `Not provided: ${missing.join(", ")}.`,
          fix: "Pass all three (use 0 to skip a type):",
          example: "/order <link> VIEWS LIKES COMMENTS",
        });
      }
      const pv = parseQty("Views", raw[0]);
      const pl = parseQty("Likes", raw[1]);
      const pc = parseQty("Comments", raw[2]);
      const err = pv.err || pl.err || pc.err;
      if (err) return orderErr({ ...err, example: EX_FULL });
      v = pv.val; l = pl.val; c = pc.val;
      if (v + l + c === 0) return orderErr({
        title: "All quantities are zero",
        problem: "Views + Likes + Comments = 0.",
        fix: "Set at least one field greater than 0.",
        example: EX_FULL,
      });
    } else {
      if (!preset) {
        return orderErr({
          title: "No quantities given and no preset saved",
          fix: "Save a preset with <code>/setdefault VIEWS LIKES COMMENTS [DRIP_MIN]</code>, or pass values inline.",
          example: EX_FULL,
        });
      }
      const hasQty = [preset.views, preset.likes, preset.comments].some((n) => Number(n) > 0);
      if (!hasQty) {
        return orderErr({
          title: "Your saved preset has all zero quantities",
          fix: "Update it with <code>/setdefault VIEWS LIKES COMMENTS</code>, or pass values inline this time.",
          example: EX_FULL,
        });
      }
      v = Math.max(0, Math.floor(Number(preset.views) || 0));
      l = Math.max(0, Math.floor(Number(preset.likes) || 0));
      c = Math.max(0, Math.floor(Number(preset.comments) || 0));
      qtySource = "preset";
    }

    // ---------- 3. Resolve + validate DRIP ----------
    let drip = 0;
    if (args[4] !== undefined && args[4] !== "") {
      if (!/^\d+$/.test(args[4])) {
        return orderErr({
          title: "DRIP_MIN is not a whole number",
          problem: `Got "<code>${args[4]}</code>".`,
          fix: "Pass minutes as an integer (0–1440).",
          example: "/order <link> 5000 500 50 60",
        });
      }
      const d = Number(args[4]);
      if (d > 1440) return orderErr({
        title: "DRIP_MIN too high",
        problem: `${d} minutes exceeds cap.`,
        fix: "Max 1440 minutes (24h).",
      });
      drip = d;
    } else {
      drip = Math.max(0, Math.floor(Number(preset?.drip_minutes) || 0));
      if (drip > 1440) drip = 1440;
    }

    // ---------- 4. Service-wise min/max enforcement ----------
    const { limits, err: limErr } = await getIgServiceLimits();
    if (limErr) return orderErr({
      title: "Cannot verify service limits right now",
      problem: limErr,
      fix: "Try again in a few seconds.",
    });
    const fmt = (n: number) => n.toLocaleString();
    const checkQty = (type: string, qty: number, label: string): { title: string; problem: string; fix: string } | null => {
      if (qty <= 0) return null;
      const lim = limits[type];
      if (!lim) return {
        title: `${label} service unavailable`,
        problem: `Not configured for Instagram right now.`,
        fix: `Use <code>0</code> for ${label.toLowerCase()}, or try again later.`,
      };
      if (qty < lim.min) return {
        title: `${label} quantity below minimum`,
        problem: `You asked for ${fmt(qty)}.`,
        fix: `Use a value in range <b>${fmt(lim.min)} – ${fmt(lim.max)}</b>, or 0 to skip.`,
      };
      if (qty > lim.max) return {
        title: `${label} quantity above maximum`,
        problem: `You asked for ${fmt(qty)}.`,
        fix: `Use a value in range <b>${fmt(lim.min)} – ${fmt(lim.max)}</b>.`,
      };
      return null;
    };
    const limIssue = checkQty("views", v, "Views") || checkQty("likes", l, "Likes") || checkQty("comments", c, "Comments");
    if (limIssue) {
      const summary = ["views", "likes", "comments"]
        .filter((t) => limits[t])
        .map((t) => `${t}: ${fmt(limits[t].min)}–${fmt(limits[t].max)}`)
        .join(" · ");
      return orderErr({ ...limIssue, extra: `\n<b>Current limits</b>\n• ${summary}` });
    }

    // ---------- 5. Duplicate-submission guard ----------
    const lockKey = `tg:order:${chatId}:${link}`;
    if ((globalThis as any).__tgOrderLocks instanceof Set === false) {
      (globalThis as any).__tgOrderLocks = new Set<string>();
    }
    const locks: Set<string> = (globalThis as any).__tgOrderLocks;
    if (locks.has(lockKey)) {
      return orderErr({
        icon: "⏳",
        title: "Order already in progress",
        problem: "A previous /order for this link is still executing.",
        fix: "Wait a few seconds, then retry.",
      });
    }
    const since = new Date(Date.now() - 90_000).toISOString();
    const { data: dupes, error: dupeErr } = await supabase
      .from("engagement_orders")
      .select("id,order_number,status,created_at,total_price")
      .eq("user_id", userId).eq("link", link).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(1);
    if (dupeErr) return orderErr({
      title: "Duplicate check failed",
      problem: dupeErr.message,
      fix: "Try again shortly.",
    });
    if (dupes && dupes.length > 0) {
      const d: any = dupes[0];
      const ageSec = Math.max(1, Math.round((Date.now() - new Date(d.created_at).getTime()) / 1000));
      return orderErr({
        icon: "⚠️",
        title: "Duplicate order blocked",
        problem: `Identical order placed ${ageSec}s ago: <code>#${d.order_number}</code> · ${d.status}.`,
        fix: `Check with <code>/status ${d.order_number}</code>. Retry after 90s if you really want a second order.`,
      });
    }

    // ---------- 6. Place order ----------
    locks.add(lockKey);
    const r = await placeEngagement(userId, link, v, l, c, drip).finally(() => locks.delete(lockKey));
    if (!r.ok) {
      const rawMsg = String(r.error ?? "Order failed");
      let fix = "Try again in a few seconds.";
      if (/insufficient|balance|wallet/i.test(rawMsg)) fix = "Top up wallet in the app, then retry.";
      else if (/subscription|plan/i.test(rawMsg)) fix = "Activate a plan (Monthly / Lifetime) to place orders.";
      else if (/service|provider|mapping/i.test(rawMsg)) fix = "Service temporarily unavailable — try again in a few minutes.";
      else if (/rate|limit|too many/i.test(rawMsg)) fix = "Slow down — you're hitting the rate limit.";
      return orderErr({ title: "Order failed", problem: rawMsg, fix });
    }
    const src = `${linkSource === "preset" ? "saved link" : "inline link"} · ${qtySource === "preset" ? "saved qty" : "inline qty"}`;
    return reply(chatId, `✅ <b>Order placed</b>\n• <b>ID:</b> <code>#${r.order_number}</code>\n• <b>Link:</b> <code>${link}</code>\n• <b>Views:</b> ${v} · <b>Likes:</b> ${l} · <b>Comments:</b> ${c}${drip ? `\n• <b>Drip:</b> ${drip}m` : ""}\n• <b>Charged:</b> ₹${r.charged_inr}\n<i>${src}</i>`);
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
    const cancelErr = (o: {
      icon?: string; title: string; problem?: string; fix?: string; example?: string; extra?: string;
    }) => {
      const lines = [`${o.icon ?? "❌"} <b>${o.title}</b>`];
      if (o.problem) lines.push(`• <b>Problem:</b> ${o.problem}`);
      if (o.fix) lines.push(`• <b>Fix:</b> ${o.fix}`);
      if (o.example) lines.push(`• <b>Example:</b> <code>${o.example}</code>`);
      if (o.extra) lines.push(o.extra);
      return reply(chatId, lines.join("\n"));
    };

    const raw = args[0];
    const n = Number(raw);
    if (!raw || !Number.isInteger(n) || n <= 0) {
      return cancelErr({
        title: "Invalid order number",
        problem: raw ? `<code>${raw}</code> is not a valid order number.` : "No order number provided.",
        fix: "Send <code>/cancel</code> followed by a positive order number. Use <code>/orders</code> to list your recent IDs.",
        example: "/cancel 123",
      });
    }

    const { data: match, error: findErr } = await supabase
      .from("engagement_orders")
      .select("id,status,order_number,link")
      .eq("user_id", userId)
      .eq("order_number", n)
      .maybeSingle();

    if (findErr) {
      return cancelErr({
        title: "Lookup failed",
        problem: findErr.message,
        fix: "Try again in a few seconds. If it persists, contact support.",
      });
    }
    if (!match) {
      return cancelErr({
        title: "Order not found",
        problem: `No order <code>#${n}</code> found in your account.`,
        fix: "Check the ID with <code>/orders</code> and try again.",
        example: "/cancel 123",
      });
    }
    if (!["pending", "processing", "paused"].includes(match.status)) {
      return cancelErr({
        icon: "⚠️",
        title: "Cannot cancel this order",
        problem: `Order <code>#${n}</code> is already <b>${match.status}</b>.`,
        fix: "Only <b>pending</b>, <b>processing</b>, or <b>paused</b> orders can be cancelled.",
      });
    }

    // 1. Flip parent order first so backend workers stop dispatching
    const { error: oErr } = await supabase
      .from("engagement_orders")
      .update({ status: "cancelled" })
      .eq("id", match.id)
      .neq("status", "cancelled");
    if (oErr) {
      return cancelErr({
        title: "Cancel failed",
        problem: oErr.message,
        fix: "Order status was not changed. Try again shortly.",
      });
    }

    // 2. Cancel non-final items
    const { data: items, error: iErr } = await supabase
      .from("engagement_order_items")
      .update({ status: "cancelled" })
      .eq("engagement_order_id", match.id)
      .not("status", "in", '("completed","cancelled","failed")')
      .select("id");
    if (iErr) {
      return cancelErr({
        icon: "⚠️",
        title: "Partial cancel",
        problem: `Order marked cancelled, but items update failed: ${iErr.message}`,
        fix: "Runs may still process. Contact support to force-stop.",
      });
    }

    // 3. Cancel non-final runs
    let runsCancelled = 0;
    const itemIds = (items ?? []).map((i: any) => i.id);
    if (itemIds.length > 0) {
      const { data: runs, error: rErr } = await supabase
        .from("organic_run_schedule")
        .update({ status: "cancelled", error_message: "Cancelled via Telegram bot", completed_at: new Date().toISOString() })
        .in("engagement_order_item_id", itemIds)
        .not("status", "in", '("completed","cancelled","failed")')
        .select("id");
      if (rErr) {
        return cancelErr({
          icon: "⚠️",
          title: "Partial cancel",
          problem: `Order and items cancelled, but pending runs update failed: ${rErr.message}`,
          fix: "Some scheduled runs may still fire. Contact support if you see new activity.",
        });
      }
      runsCancelled = runs?.length ?? 0;
    }

    // 4. Verify final status to confirm accurate update
    const { data: verify } = await supabase
      .from("engagement_orders")
      .select("status")
      .eq("id", match.id)
      .maybeSingle();

    if (verify?.status !== "cancelled") {
      return cancelErr({
        icon: "⚠️",
        title: "Cancel not confirmed",
        problem: `Expected status <b>cancelled</b>, got <b>${verify?.status ?? "unknown"}</b>.`,
        fix: "Retry <code>/cancel</code> or contact support.",
      });
    }

    return reply(
      chatId,
      [
        `✅ <b>Order #${n} cancelled</b>`,
        `• <b>Status:</b> cancelled (confirmed)`,
        `• <b>Items stopped:</b> ${itemIds.length}`,
        `• <b>Runs stopped:</b> ${runsCancelled}`,
        `• <b>Post:</b> <a href="${match.link}">view</a>`,
        `• <b>Refund:</b> user cancellations are non-refundable`,
      ].join("\n"),
    );
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
