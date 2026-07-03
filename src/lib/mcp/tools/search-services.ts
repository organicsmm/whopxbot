import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_services",
  title: "Search available SMM services",
  description: "Searches active SMM services by keyword (name, platform, category).",
  inputSchema: {
    query: z.string().min(1).describe("Keyword to match against service name, platform, or category."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const q = `%${query}%`;
    const { data, error } = await supabase
      .from("services")
      .select("id, name, platform, category, rate, min, max, is_active")
      .eq("is_active", true)
      .or(`name.ilike.${q},platform.ilike.${q},category.ilike.${q}`)
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { services: data ?? [] },
    };
  },
});
