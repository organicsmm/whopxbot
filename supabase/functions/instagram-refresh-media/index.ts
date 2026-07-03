import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

function detectMediaType(p: any): string {
  const t = String(p.type ?? p.__typename ?? '').toLowerCase();
  if (t.includes('video') || p.videoUrl) {
    if (p.productType === 'clips' || String(p.url ?? '').includes('/reel/')) return 'reel';
    return 'video';
  }
  if (t.includes('sidecar') || t.includes('carousel')) return 'carousel';
  return 'image';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!APIFY_TOKEN) throw new Error('APIFY_API_TOKEN not configured');

    const body = await req.json().catch(() => ({}));
    const accountId = String(body.account_id ?? '');
    const resultsLimit = Math.min(Math.max(Number(body.results_limit ?? 50), 1), 200);
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'account_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth: either service-role (from cron/other functions) or user JWT owning the account
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.replace('Bearer ', '');
    const isService = bearer === SERVICE_KEY;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let userIdCheck: string | null = null;
    if (!isService) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userRes } = await userClient.auth.getUser(bearer);
      if (!userRes?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userIdCheck = userRes.user.id;
    }

    const { data: account, error: accErr } = await admin
      .from('instagram_accounts').select('*').eq('id', accountId).single();
    if (accErr || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (userIdCheck && account.user_id !== userIdCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=180`;
    const apifyRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${account.username}/`],
        resultsType: 'posts',
        resultsLimit,
        addParentData: false,
      }),
    });
    const text = await apifyRes.text();
    if (!apifyRes.ok) {
      return new Response(JSON.stringify({ error: `Apify posts failed [${apifyRes.status}]: ${text.slice(0, 300)}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let posts: any[] = [];
    try { posts = JSON.parse(text); } catch { posts = []; }
    if (!Array.isArray(posts)) posts = [];

    let imported = 0, updated = 0;
    for (const p of posts) {
      const mediaId = String(p.id ?? p.shortCode ?? '');
      const shortcode = p.shortCode ?? p.shortcode ?? null;
      const permalink = p.url ?? (shortcode ? `https://www.instagram.com/p/${shortcode}/` : null);
      if (!mediaId || !permalink) continue;

      const payload = {
        account_id: account.id,
        user_id: account.user_id,
        media_id: mediaId,
        shortcode,
        media_type: detectMediaType(p),
        permalink,
        thumbnail_url: p.displayUrl ?? p.thumbnailUrl ?? null,
        caption: (p.caption ?? '').slice(0, 2000),
        like_count: p.likesCount ?? 0,
        comment_count: p.commentsCount ?? 0,
        view_count: p.videoViewCount ?? p.videoPlayCount ?? 0,
        posted_at: p.timestamp ? new Date(p.timestamp).toISOString() : null,
      };

      const { data: existing } = await admin
        .from('instagram_media').select('id').eq('account_id', account.id).eq('media_id', mediaId).maybeSingle();

      const { error: upErr } = await admin
        .from('instagram_media')
        .upsert(payload, { onConflict: 'account_id,media_id' });
      if (upErr) { console.error('upsert media err', upErr); continue; }
      if (existing) updated++; else imported++;
    }

    await admin.from('instagram_accounts')
      .update({ last_scraped_at: new Date().toISOString(), posts_count: posts.length })
      .eq('id', account.id);

    return new Response(JSON.stringify({ imported, updated, total: posts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('instagram-refresh-media error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
