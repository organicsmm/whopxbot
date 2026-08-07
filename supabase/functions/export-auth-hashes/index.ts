import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const migrationToken = Deno.env.get("MIGRATION_TOKEN");

    let isAuthorized = false;

    // Option 1: static migration token
    if (migrationToken && token === migrationToken) {
      isAuthorized = true;
    }

    // Option 2: valid admin JWT
    if (!isAuthorized) {
      const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
      if (!userError && user) {
        const { data: role } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .single();
        if (role) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull all auth.users with their encrypted password hash.
    // Supabase GoTrue admin listUsers is paginated; we loop through pages.
    const users: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) throw error;
      const list = data?.users || [];
      if (list.length === 0) break;
      users.push(...list);
      if (list.length < perPage) break;
      page++;
    }

    // Build auth-users.json compatible with import-auth-users.sh
    const authUsersJson = users.map((u) => ({
      id: u.id,
      email: u.email,
      user_metadata: u.user_metadata || {},
    }));

    // Build password hash SQL compatible with import-auth-passwords.sh
    // We escape the bcrypt hash by using dollar-quoting with a random tag
    // to avoid issues with embedded quotes or backslashes.
    const passwordUpdates: string[] = [];
    for (const u of users) {
      const hash = (u as any).encrypted_password;
      if (!hash) continue;
      const tag = `HASH${Math.random().toString(36).slice(2, 8)}`;
      passwordUpdates.push(
        `UPDATE auth.users SET encrypted_password = $${tag}$${hash}$${tag}$ WHERE id = '${u.id}';`
      );
    }

    return new Response(
      JSON.stringify(
        {
          count: users.length,
          users: authUsersJson,
          password_sql: passwordUpdates.join("\n"),
        },
        null,
        2
      ),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("export-auth-hashes error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
