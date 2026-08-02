// One-time migration helper: exports auth.users password hashes as SQL UPDATE
// statements into the private `data-exports` bucket. Requires the service role
// key in the x-export-key header. Hashes are bcrypt (one-way) and are never
// returned in the response body — only a signed download URL is.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { Client } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const provided = req.headers.get('x-export-key') ?? '';
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const apikey = req.headers.get('apikey') ?? '';
  const authorized = !!serviceKey &&
    (provided === serviceKey || bearer === serviceKey || apikey === serviceKey);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }


  const dbUrl = Deno.env.get('SUPABASE_DB_URL');
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: 'SUPABASE_DB_URL missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const pg = new Client(dbUrl);
  await pg.connect();
  let sql = '';
  let count = 0;
  try {
    const res = await pg.queryObject<{
      id: string;
      email: string | null;
      encrypted_password: string | null;
      confirmed: string | null;
    }>(
      `select id::text as id, email, encrypted_password,
              coalesce(email_confirmed_at, now())::text as confirmed
         from auth.users
        where encrypted_password is not null and encrypted_password <> ''`,
    );
    count = res.rows.length;
    const esc = (v: string) => v.replace(/'/g, "''");
    const lines = res.rows.map(
      (r) =>
        `UPDATE auth.users SET encrypted_password = '${esc(r.encrypted_password!)}', ` +
        `email_confirmed_at = COALESCE(email_confirmed_at, '${esc(r.confirmed!)}'::timestamptz) ` +
        `WHERE id = '${esc(r.id)}';`,
    );
    sql =
      `-- OrganicSMM Pro: auth password hash migration (${count} users)\nBEGIN;\n` +
      lines.join('\n') +
      `\nCOMMIT;\n`;
  } finally {
    await pg.end();
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
  const path = `auth-passwords-${Date.now()}.sql`;
  const up = await supabase.storage
    .from('data-exports')
    .upload(path, new Blob([sql], { type: 'text/plain' }), { upsert: true });
  if (up.error) {
    return new Response(JSON.stringify({ error: up.error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const signed = await supabase.storage.from('data-exports').createSignedUrl(path, 60 * 60 * 24);
  if (signed.error) {
    return new Response(JSON.stringify({ error: signed.error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ users: count, url: signed.data.signedUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
