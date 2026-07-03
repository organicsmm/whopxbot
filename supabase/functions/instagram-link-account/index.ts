import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!APIFY_TOKEN) throw new Error('APIFY_API_TOKEN not configured');

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Authorization token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Verify token via service-role admin client (avoids stale anon key issues)
    const adminAuthClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: userErr } = await adminAuthClient.auth.getUser(token);
    if (userErr || !userRes?.user) {
      console.error('auth.getUser failed', userErr?.message);
      return new Response(JSON.stringify({ error: `Auth verification failed: ${userErr?.message ?? 'no user'}` }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userRes.user.id;

    // Subscription gate (admin bypass)
    const adminAuth = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await adminAuth
      .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
    if (!roleRow) {
      const { data: sub } = await adminAuth
        .from('subscriptions').select('status,plan_type').eq('user_id', userId).maybeSingle();
      const active = sub && sub.status === 'active' && sub.plan_type !== 'trial';
      if (!active) {
        return new Response(JSON.stringify({ error: 'Active subscription required to link Instagram accounts.' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    let username = String(body.username ?? '').trim().replace(/^@/, '').replace(/\/$/, '');
    if (!username || !/^[A-Za-z0-9._]{1,30}$/.test(username)) {
      return new Response(JSON.stringify({ error: 'Invalid username' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apify: profile scraper (sync) — retry once on timeout/empty
    const fetchProfile = async (timeoutSec: number) => {
      const url = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=${timeoutSec}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [username] }),
      });
      const text = await res.text();
      return { ok: res.ok, status: res.status, text };
    };

    let attempt = await fetchProfile(240);
    if (!attempt.ok || attempt.text.trim() === '' || attempt.text === '[]') {
      console.warn(`Profile scrape attempt 1 failed/empty for @${username}, retrying. status=${attempt.status} body=${attempt.text.slice(0, 200)}`);
      await new Promise(r => setTimeout(r, 1500));
      attempt = await fetchProfile(240);
    }
    if (!attempt.ok) {
      return new Response(JSON.stringify({ error: `Apify profile fetch failed [${attempt.status}]: ${attempt.text.slice(0, 300)}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    let profileArr: any[] = [];
    try { profileArr = JSON.parse(attempt.text); } catch { profileArr = []; }
    const profile = Array.isArray(profileArr) ? profileArr[0] : null;
    if (!profile || profile.error || (!profile.username && !profile.id && !profile.fullName)) {
      const detail = profile?.error ? ` (${JSON.stringify(profile.error).slice(0, 150)})` : '';
      console.error(`Profile not found for @${username}. Apify returned: ${attempt.text.slice(0, 300)}`);
      return new Response(JSON.stringify({ error: `Instagram profile not found for @${username}${detail}. Check username spelling or try again — the profile may be private or Apify timed out.` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const upsertPayload = {
      user_id: userId,
      username: (profile.username || username).toLowerCase(),
      ig_user_id: profile.id ? String(profile.id) : null,
      full_name: profile.fullName ?? null,
      avatar_url: profile.profilePicUrl ?? profile.profilePicUrlHD ?? null,
      followers: profile.followersCount ?? 0,
      following: profile.followsCount ?? 0,
      posts_count: profile.postsCount ?? 0,
      is_private: !!profile.private,
      is_verified: !!profile.verified,
      biography: profile.biography ?? null,
      status: 'active',
      last_scraped_at: new Date().toISOString(),
    };
    const { data: account, error: accErr } = await admin
      .from('instagram_accounts')
      .upsert(upsertPayload, { onConflict: 'user_id,username' })
      .select()
      .single();
    if (accErr) throw accErr;

    // Kick off initial media backfill in background (do NOT await — return fast)
    try {
      const bgPromise = fetch(`${SUPABASE_URL}/functions/v1/instagram-refresh-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
        },
        body: JSON.stringify({ account_id: account.id, results_limit: 12 }),
      }).catch((e) => console.error('bg refresh-media failed', e));
      // @ts-ignore EdgeRuntime background task
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        // @ts-ignore
        EdgeRuntime.waitUntil(bgPromise);
      }
    } catch (e) {
      console.error('refresh-media invocation failed', e);
    }

    return new Response(JSON.stringify({ account, imported: 0, importing: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('instagram-link-account error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
