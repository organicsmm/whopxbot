import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { link, types, totalQuantity, platform } = await req.json();
    if (!link || !types || !totalQuantity) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "AI key missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeList = Array.isArray(types) ? types.join(", ") : String(types);

    const systemPrompt = `You are an organic social media growth strategist. Given a post URL, platform, engagement types, and total target quantity, recommend the SAFEST organic delivery plan that mimics human behavior and avoids platform bot detection.

Rules:
- Larger quantities = longer delivery window
- Views deliver fastest, comments/saves slowest
- Always recommend natural curve, never instant
- Account age & post age affect safety
- Return STRICT JSON only, no prose

Output schema:
{
  "delivery_hours": number (total hours to complete),
  "runs": number (how many drip runs),
  "per_type_hours": { "views": number, "likes": number, ... only for requested types },
  "safety_score": number (0-100, higher = safer),
  "warnings": string[] (max 2 short warnings),
  "explanation": string (1-2 sentences in Hindi/English mix explaining why)
}`;

    const userPrompt = `Platform: ${platform || "instagram"}
Post URL: ${link}
Engagement types: ${typeList}
Total target quantity: ${totalQuantity}

Recommend the best organic delivery plan.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Try again in a minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Contact admin." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "AI error", detail: t.slice(0, 200) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    return new Response(JSON.stringify({ success: true, recommendation: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
