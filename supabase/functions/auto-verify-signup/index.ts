// Public signup endpoint. Uses Supabase's standard signUp() flow (rate-limited,
// honors email confirmation settings) instead of the admin API. This prevents
// unauthenticated attackers from creating pre-confirmed accounts for arbitrary
// email addresses they do not own.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anon = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { email: rawEmail, password, fullName } = await req.json().catch(() => ({}))
    const email = String(rawEmail ?? '').trim().toLowerCase()
    const pw = String(password ?? '')

    if (!email || !pw) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (pw.length < 8 || pw.length > 128) {
      return new Response(JSON.stringify({ error: 'Password must be 8–128 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Standard public signup — no admin API, no forced email_confirm bypass.
    // Supabase applies its rate-limits and (if enabled) email confirmation.
    const { data, error } = await anon.auth.signUp({
      email,
      password: pw,
      options: {
        data: { full_name: String(fullName ?? '').slice(0, 120) },
      },
    })

    if (error) {
      const msg = error.message.toLowerCase().includes('registered')
        ? 'This email is already registered.'
        : error.message
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
