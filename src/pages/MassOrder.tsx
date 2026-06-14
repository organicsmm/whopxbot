import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { useGlobalMarkup } from "@/hooks/useGlobalMarkup";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformSelector } from "@/components/engagement/PlatformSelector";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Loader2, Rocket, Trash2, Pencil, Link as LinkIcon, AlertCircle,
  Upload, Download, Search, RefreshCw, CheckCircle2, XCircle, Clock,
  FileText, BarChart3, ExternalLink, Eye,
} from "lucide-react";

// ---------- Types ----------
type MetricKey = "likes" | "comments" | "shares" | "saves";
const METRIC_KEYS: MetricKey[] = ["likes", "comments", "shares", "saves"];

interface Range { min: number; max: number }
interface MetricCfg { enabled: boolean; min: number; max: number }
type TimeframeType = "24h" | "3d" | "7d" | "14d" | "custom";

interface CardData {
  id: string;
  link: string;
  views: Range;
  metrics: Record<MetricKey, MetricCfg>;
  timeframe: TimeframeType;
  customDate?: string;
  resolved: { views: number; metrics: Partial<Record<MetricKey, number>>; hours: number };
}

// ---------- Helpers ----------
const isValidUrl = (s: string) => {
  try { const u = new URL(s.trim()); return u.protocol === "http:" || u.protocol === "https:"; }
  catch { return false; }
};
const randInt = (min: number, max: number) => {
  if (max < min) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
const timeframeHours = (t: TimeframeType, customDate?: string): number => {
  if (t === "24h") return 24;
  if (t === "3d") return 72;
  if (t === "7d") return 168;
  if (t === "14d") return 336;
  if (t === "custom" && customDate) {
    const diff = (new Date(customDate).getTime() - Date.now()) / 3600000;
    return Math.max(1, Math.min(720, Math.round(diff)));
  }
  return 24;
};
const truncate = (s: string, n = 50) => (s.length > n ? s.slice(0, n) + "…" : s);

// Smart CSV/TXT parser — picks first http(s) cell per row, falls back to whole line.
const parseCsvOrTxt = (text: string): string[] => {
  const out: string[] = [];
  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    // try CSV split first
    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const urlCell = cells.find((c) => /^https?:\/\//i.test(c));
    if (urlCell) out.push(urlCell);
    else if (/^https?:\/\//i.test(line)) out.push(line);
  });
  return out;
};

const STATUS_BADGE: Record<string, { color: string; icon: any }> = {
  processing: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Loader2 },
  completed: { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  partial: { color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertCircle },
  failed: { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

// ---------- Page ----------
export default function MassOrder() {
  const navigate = useNavigate();
  const { user, wallet, refreshWallet } = useAuth();
  const { formatPrice } = useCurrency();
  const { applyMarkup } = useGlobalMarkup();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"create" | "batches">("create");

  // -- create form state --
  const [batchName, setBatchName] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [linksText, setLinksText] = useState("");
  const [views, setViews] = useState<Range>({ min: 1500, max: 3000 });
  const [metrics, setMetrics] = useState<Record<MetricKey, MetricCfg>>({
    likes: { enabled: true, min: 100, max: 200 },
    comments: { enabled: false, min: 5, max: 15 },
    shares: { enabled: false, min: 20, max: 50 },
    saves: { enabled: false, min: 30, max: 80 },
  });
  const [timeframe, setTimeframe] = useState<TimeframeType>("24h");
  const [customDate, setCustomDate] = useState<string>("");
  const [overrides, setOverrides] = useState<Record<string, Partial<CardData>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  // -- batches tab state --
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewingBatchId, setViewingBatchId] = useState<string | null>(null);

  // ---------- Data: bundles ----------
  const { data: bundles } = useQuery({
    queryKey: ["mass-order-bundles", platform],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engagement_bundles")
        .select(`*, items:bundle_items(*, service:services(id, name, price, min_quantity))`)
        .eq("platform", platform)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!platform,
    staleTime: 5 * 60 * 1000,
  });
  const bundle = bundles?.[0];

  const serviceMap = useMemo(() => {
    const m: Record<string, { serviceId: string | null; pricePerK: number; minQty: number }> = {};
    bundle?.items?.forEach((it: any) => {
      const pricePerK = it.price_per_k != null && Number(it.price_per_k) > 0
        ? Number(it.price_per_k) : (it.service?.price ?? 0);
      m[it.engagement_type] = {
        serviceId: it.service?.id ?? it.service_id ?? null,
        pricePerK,
        minQty: it.service?.min_quantity ?? 0,
      };
    });
    return m;
  }, [bundle]);

  // ---------- Data: batches ----------
  const { data: batches, refetch: refetchBatches, isFetching: batchesLoading } = useQuery({
    queryKey: ["mass-order-batches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("mass_order_batches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
    staleTime: 10 * 1000,
  });

  const { data: viewingItems } = useQuery({
    queryKey: ["mass-order-batch-items", viewingBatchId],
    queryFn: async () => {
      if (!viewingBatchId) return [];
      const { data, error } = await supabase
        .from("mass_order_batch_items")
        .select("*")
        .eq("batch_id", viewingBatchId)
        .order("created_at");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!viewingBatchId,
  });
  const viewingBatch = batches?.find((b) => b.id === viewingBatchId);

  // ---------- Parse links ----------
  const parsedLinks = useMemo(() => linksText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean), [linksText]);
  const linkValidity = useMemo(() => parsedLinks.map(isValidUrl), [parsedLinks]);
  const validLinks = useMemo(() => parsedLinks.filter((_, i) => linkValidity[i]), [parsedLinks, linkValidity]);

  const cards: CardData[] = useMemo(() => {
    return validLinks.map((link, idx) => {
      const id = `${idx}-${link}`;
      const ov = overrides[id] || {};
      const v = ov.views ?? views;
      const mts = ov.metrics ?? metrics;
      const tf = ov.timeframe ?? timeframe;
      const cd = ov.customDate ?? customDate;
      const hours = timeframeHours(tf, cd);
      const resolvedViews = randInt(v.min, v.max);
      const resolvedMetrics: Partial<Record<MetricKey, number>> = {};
      METRIC_KEYS.forEach((k) => { if (mts[k]?.enabled) resolvedMetrics[k] = randInt(mts[k].min, mts[k].max); });
      return { id, link, views: v, metrics: mts, timeframe: tf, customDate: cd,
        resolved: { views: resolvedViews, metrics: resolvedMetrics, hours } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validLinks, overrides, views, metrics, timeframe, customDate]);

  const cardCost = useCallback((c: CardData) => {
    const types: { type: string; qty: number }[] = [{ type: "views", qty: c.resolved.views }];
    METRIC_KEYS.forEach((k) => { const q = c.resolved.metrics[k]; if (q) types.push({ type: k, qty: q }); });
    return types.reduce((sum, t) => {
      const s = serviceMap[t.type];
      return s ? sum + (t.qty / 1000) * applyMarkup(s.pricePerK) : sum;
    }, 0);
  }, [serviceMap, applyMarkup]);

  const totalCost = useMemo(() => cards.reduce((s, c) => s + cardCost(c), 0), [cards, cardCost]);

  const errors = useMemo(() => {
    const list: string[] = [];
    if (parsedLinks.length === 0) list.push("Add at least 1 link.");
    if (parsedLinks.some((_, i) => !linkValidity[i])) list.push("Some links are invalid (must start with http/https).");
    if (new Set(validLinks).size !== validLinks.length) list.push("Duplicate links detected.");
    if (!(views.min > 0 && views.max > 0 && views.min <= views.max)) list.push("Views range invalid.");
    METRIC_KEYS.forEach((k) => {
      const m = metrics[k];
      if (m.enabled && !(m.min > 0 && m.max > 0 && m.min <= m.max)) list.push(`${k} range invalid.`);
    });
    if (timeframe === "custom" && !customDate) list.push("Pick a custom deadline date.");
    if (!serviceMap["views"]) list.push(`No "views" service in ${platform} bundle.`);
    if (wallet && wallet.balance < totalCost) list.push(`Insufficient balance. Need ${formatPrice(totalCost)}, have ${formatPrice(wallet.balance)}.`);
    return list;
  }, [parsedLinks, linkValidity, validLinks, views, metrics, timeframe, customDate, serviceMap, platform, wallet, totalCost, formatPrice]);

  const canSubmit = errors.length === 0 && cards.length > 0 && !submitting;

  // ---------- File upload ----------
  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
      return;
    }
    const text = await file.text();
    const parsed = parseCsvOrTxt(text);
    if (parsed.length === 0) {
      toast({ title: "No URLs found", description: "File must contain http(s) URLs.", variant: "destructive" });
      return;
    }
    // merge + dedupe
    const existing = new Set(parsedLinks);
    const merged = [...parsedLinks];
    parsed.forEach((u) => { if (!existing.has(u)) { merged.push(u); existing.add(u); } });
    setLinksText(merged.join("\n"));
    toast({ title: "Imported", description: `${parsed.length} URLs from ${file.name}` });
  };

  // ---------- Submit ----------
  const handleSubmitAll = async () => {
    if (!user || !canSubmit || !bundle) return;
    setSubmitting(true);
    setProgress({ done: 0, total: cards.length });

    // 1. Create batch row
    const { data: batchRow, error: batchErr } = await supabase
      .from("mass_order_batches")
      .insert({
        user_id: user.id,
        name: batchName.trim() || `Batch ${new Date().toLocaleString()}`,
        platform,
        total_count: cards.length,
        status: "processing",
        total_price: totalCost,
      })
      .select()
      .single();

    if (batchErr || !batchRow) {
      toast({ title: "Failed to start batch", description: batchErr?.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // 2. Create batch items (pending)
    const itemsToInsert = cards.map((c) => ({
      batch_id: batchRow.id,
      user_id: user.id,
      link: c.link,
      status: "pending",
      price: cardCost(c),
      payload: {
        views: c.resolved.views,
        metrics: c.resolved.metrics,
        hours: c.resolved.hours,
        timeframe: c.timeframe,
      },
    }));
    const { data: insertedItems } = await supabase
      .from("mass_order_batch_items")
      .insert(itemsToInsert)
      .select();
    const itemByLink = new Map<string, any>();
    (insertedItems || []).forEach((it: any) => itemByLink.set(it.link, it));

    let okCount = 0, failCount = 0;

    // 3. Submit each order sequentially
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const itemRow = itemByLink.get(c.link);
      try {
        const engagements: any[] = [];
        const pushType = (type: string, qty: number) => {
          const s = serviceMap[type];
          if (!s || !s.serviceId || qty <= 0) return;
          const price = (qty / 1000) * applyMarkup(s.pricePerK);
          engagements.push({
            type, quantity: qty, price, service_id: s.serviceId,
            time_limit_hours: c.resolved.hours,
            variance_percent: 15, peak_hours_enabled: true,
          });
        };
        pushType("views", c.resolved.views);
        METRIC_KEYS.forEach((k) => { const q = c.resolved.metrics[k]; if (q) pushType(k, q); });
        const totalPrice = engagements.reduce((s, e) => s + e.price, 0);

        const { data, error } = await supabase.functions.invoke("process-engagement-order", {
          body: {
            user_id: user.id,
            bundle_id: bundle.id,
            link: c.link,
            campaign_name: batchName.trim() || null,
            base_quantity: c.resolved.views,
            total_price: totalPrice,
            is_organic_mode: true,
            engagements,
          },
        });

        if (error) {
          let message = (error as any)?.message || "Order failed";
          const ctx = (error as any)?.context;
          if (ctx && typeof ctx.text === "function") {
            try {
              const text = await ctx.text();
              const parsed = JSON.parse(text);
              message = parsed?.error || parsed?.message || text;
            } catch { /* ignore */ }
          }
          throw new Error(message);
        }
        if ((data as any)?.error) throw new Error((data as any).error);

        okCount++;
        if (itemRow) {
          await supabase.from("mass_order_batch_items").update({
            status: "success",
            engagement_order_id: (data as any)?.order_id,
            engagement_order_number: (data as any)?.order_number,
          }).eq("id", itemRow.id);
        }
      } catch (e: any) {
        failCount++;
        if (itemRow) {
          await supabase.from("mass_order_batch_items").update({
            status: "failed",
            error_message: e?.message?.slice(0, 500) || "Failed",
          }).eq("id", itemRow.id);
        }
      }

      setProgress({ done: i + 1, total: cards.length });

      // Update batch counts as we go
      await supabase.from("mass_order_batches").update({
        success_count: okCount,
        failed_count: failCount,
      }).eq("id", batchRow.id);

      refreshWallet();
    }

    // 4. Finalize status
    const finalStatus = failCount === 0 ? "completed" : okCount === 0 ? "failed" : "partial";
    await supabase.from("mass_order_batches").update({ status: finalStatus }).eq("id", batchRow.id);

    setSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ["mass-order-batches"] });

    toast({
      title: finalStatus === "completed" ? "🚀 Batch Complete" : `${okCount} ok, ${failCount} failed`,
      description: `Batch "${batchRow.name}" finished.`,
      variant: finalStatus === "failed" ? "destructive" : "default",
    });

    if (finalStatus !== "failed") {
      setLinksText("");
      setBatchName("");
      setOverrides({});
    }
    setActiveTab("batches");
  };

  // ---------- CSV download ----------
  const downloadBatchCsv = async (batchId: string, batchName: string) => {
    const { data } = await supabase.from("mass_order_batch_items").select("*").eq("batch_id", batchId).order("created_at");
    if (!data || data.length === 0) {
      toast({ title: "Empty batch", variant: "destructive" });
      return;
    }
    const header = ["Link", "Status", "Order #", "Price", "Views", "Metrics", "Hours", "Error"];
    const rows = data.map((it: any) => {
      const p = it.payload || {};
      const metrics = Object.entries(p.metrics || {}).map(([k, v]) => `${k}:${v}`).join("|");
      return [
        it.link, it.status, it.engagement_order_number ?? "", it.price ?? "",
        p.views ?? "", metrics, p.hours ?? "", (it.error_message ?? "").replace(/[\r\n,]/g, " "),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${batchName.replace(/[^a-z0-9]/gi, "_")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Edit dialog ----------
  const editingCard = cards.find((c) => c.id === editingId) || null;
  const updateOverride = (id: string, patch: Partial<CardData>) =>
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const removeLink = (link: string) =>
    setLinksText((t) => t.split(/\r?\n/).filter((l) => l.trim() !== link).join("\n"));

  // ---------- Batches stats ----------
  const stats = useMemo(() => {
    const s = { total: 0, completed: 0, processing: 0, failed: 0, partial: 0 };
    (batches || []).forEach((b: any) => {
      s.total++;
      if (b.status === "completed") s.completed++;
      else if (b.status === "processing") s.processing++;
      else if (b.status === "failed") s.failed++;
      else if (b.status === "partial") s.partial++;
    });
    return s;
  }, [batches]);
  const successRate = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  const filteredBatches = useMemo(() => {
    return (batches || []).filter((b: any) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (search && !(b.name || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [batches, statusFilter, search]);

  if (!user) { navigate("/auth"); return null; }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Rocket className="w-6 h-6 text-orange-500" /> Mass Order
            </h1>
            <p className="text-sm text-muted-foreground">Submit bulk engagement orders + track every batch.</p>
          </div>
          {activeTab === "create" && (
            <Badge variant="outline" className="text-sm">
              Total: <span className="font-bold ml-1">{formatPrice(totalCost)}</span>
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList>
            <TabsTrigger value="create"><Rocket className="w-4 h-4 mr-1" /> Create</TabsTrigger>
            <TabsTrigger value="batches"><BarChart3 className="w-4 h-4 mr-1" /> Batches</TabsTrigger>
          </TabsList>

          {/* ---------- CREATE TAB ---------- */}
          <TabsContent value="create" className="mt-6">
            <div className="grid lg:grid-cols-5 gap-6">
              {/* LEFT: config */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Batch & Links</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs">Batch Name (optional)</Label>
                      <Input value={batchName} onChange={(e) => setBatchName(e.target.value)}
                        placeholder="e.g. Diwali Campaign" className="mt-1" />
                    </div>
                    <PlatformSelector selected={platform} onSelect={setPlatform} />
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs">Links (one per line)</Label>
                        <Button size="sm" variant="outline" type="button"
                          onClick={() => fileInputRef.current?.click()}>
                          <Upload className="w-3 h-3 mr-1" /> Import CSV/TXT
                        </Button>
                        <input ref={fileInputRef} type="file" accept=".csv,.txt,text/csv,text/plain"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
                      </div>
                      <Textarea value={linksText} onChange={(e) => setLinksText(e.target.value)}
                        placeholder={"https://instagram.com/reel/...\nhttps://instagram.com/reel/..."}
                        rows={6} className="font-mono text-sm" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {validLinks.length} valid / {parsedLinks.length} total
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Views (Required)</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Min</Label>
                      <Input type="number" min={1} value={views.min}
                        onChange={(e) => setViews((v) => ({ ...v, min: Math.max(1, Number(e.target.value) || 0) }))} />
                    </div>
                    <div>
                      <Label className="text-xs">Max</Label>
                      <Input type="number" min={1} value={views.max}
                        onChange={(e) => setViews((v) => ({ ...v, max: Math.max(1, Number(e.target.value) || 0) }))} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Engagement Metrics (Optional)</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {METRIC_KEYS.map((k) => (
                      <div key={k} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="capitalize font-medium">{k}</Label>
                          <Switch checked={metrics[k].enabled}
                            onCheckedChange={(v) => setMetrics((m) => ({ ...m, [k]: { ...m[k], enabled: v } }))} />
                        </div>
                        {metrics[k].enabled && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input type="number" min={1} placeholder="Min" value={metrics[k].min}
                              onChange={(e) => setMetrics((m) => ({ ...m, [k]: { ...m[k], min: Math.max(1, Number(e.target.value) || 0) } }))} />
                            <Input type="number" min={1} placeholder="Max" value={metrics[k].max}
                              onChange={(e) => setMetrics((m) => ({ ...m, [k]: { ...m[k], max: Math.max(1, Number(e.target.value) || 0) } }))} />
                          </div>
                        )}
                        {metrics[k].enabled && !serviceMap[k] && (
                          <p className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> No "{k}" service in {platform} bundle — will be skipped.
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Timeframe</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <Select value={timeframe} onValueChange={(v) => setTimeframe(v as TimeframeType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">Under 24 hours</SelectItem>
                        <SelectItem value="3d">1–3 days</SelectItem>
                        <SelectItem value="7d">3–7 days</SelectItem>
                        <SelectItem value="14d">7–14 days</SelectItem>
                        <SelectItem value="custom">Custom date</SelectItem>
                      </SelectContent>
                    </Select>
                    {timeframe === "custom" && (
                      <Input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
                    )}
                  </CardContent>
                </Card>

                {errors.length > 0 && (
                  <Card className="border-amber-300 bg-amber-50">
                    <CardContent className="pt-4 space-y-1">
                      {errors.map((e, i) => (
                        <p key={i} className="text-xs text-amber-900 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {e}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {submitting && progress && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Submitting…</span>
                        <strong>{progress.done}/{progress.total}</strong>
                      </div>
                      <Progress value={(progress.done / Math.max(1, progress.total)) * 100} />
                    </CardContent>
                  </Card>
                )}

                <Button onClick={handleSubmitAll} disabled={!canSubmit} className="w-full h-12 text-base font-semibold">
                  {submitting && progress ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting {progress.done}/{progress.total}…</>
                  ) : (
                    <><Rocket className="w-4 h-4 mr-2" /> Submit All Orders ({cards.length})</>
                  )}
                </Button>
              </div>

              {/* RIGHT: card grid */}
              <div className="lg:col-span-3">
                {cards.length === 0 ? (
                  <Card className="p-12 text-center text-muted-foreground">
                    <LinkIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    Paste or import links to see live preview cards here.
                  </Card>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {cards.map((c) => (
                      <Card key={c.id} className="hover:shadow-md transition">
                        <CardContent className="pt-4 space-y-2 text-sm">
                          <a href={c.link} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline break-all">{truncate(c.link, 60)}</a>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            <div><span className="text-muted-foreground">Views:</span> <strong>{c.views.min}–{c.views.max}</strong></div>
                            {METRIC_KEYS.map((k) => c.metrics[k]?.enabled && (
                              <div key={k}><span className="text-muted-foreground capitalize">{k}:</span> <strong>{c.metrics[k].min}–{c.metrics[k].max}</strong></div>
                            ))}
                            <div className="col-span-2"><span className="text-muted-foreground">Deadline:</span> <strong>{c.resolved.hours}h</strong></div>
                            <div className="col-span-2"><span className="text-muted-foreground">Est. cost:</span> <strong>{formatPrice(cardCost(c))}</strong></div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="outline" onClick={() => setEditingId(c.id)}>
                              <Pencil className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeLink(c.link)}>
                              <Trash2 className="w-3 h-3 mr-1" /> Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ---------- BATCHES TAB ---------- */}
          <TabsContent value="batches" className="mt-6 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Total" value={stats.total} icon={FileText} color="text-gray-600" />
              <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="text-green-600" />
              <StatCard label="Processing" value={stats.processing} icon={Loader2} color="text-blue-600" />
              <StatCard label="Failed/Partial" value={stats.failed + stats.partial} icon={XCircle} color="text-red-600" />
              <StatCard label="Success Rate" value={`${successRate}%`} icon={BarChart3} color="text-orange-600" />
            </div>

            {/* Filter row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by batch name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetchBatches()}>
                <RefreshCw className={`w-4 h-4 mr-1 ${batchesLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {/* List */}
            {filteredBatches.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                No batches yet. Create one from the "Create" tab.
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredBatches.map((b: any) => {
                  const cfg = STATUS_BADGE[b.status] || STATUS_BADGE.processing;
                  const Icon = cfg.icon;
                  const pct = b.total_count ? Math.round((b.success_count / b.total_count) * 100) : 0;
                  return (
                    <Card key={b.id} className="hover:shadow-md transition">
                      <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold truncate">{b.name}</h3>
                              <Badge className={cfg.color}>
                                <Icon className={`w-3 h-3 mr-1 ${b.status === "processing" ? "animate-spin" : ""}`} />
                                {b.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {b.platform} • {b.success_count}/{b.total_count} ok • {b.failed_count} failed • {formatPrice(b.total_price || 0)}
                            </div>
                            <Progress value={pct} className="h-1.5 mt-2" />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setViewingBatchId(b.id)}>
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => downloadBatchCsv(b.id, b.name)}>
                              <Download className="w-3 h-3 mr-1" /> CSV
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ---------- Edit Card Dialog ---------- */}
      <Dialog open={!!editingCard} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Order</DialogTitle></DialogHeader>
          {editingCard && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Link</Label>
                <Input value={editingCard.link} readOnly className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Views Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={editingCard.views.min}
                    onChange={(e) => updateOverride(editingCard.id, { views: { ...editingCard.views, min: Number(e.target.value) || 1 } })} />
                  <Input type="number" value={editingCard.views.max}
                    onChange={(e) => updateOverride(editingCard.id, { views: { ...editingCard.views, max: Number(e.target.value) || 1 } })} />
                </div>
              </div>
              {METRIC_KEYS.map((k) => (
                <div key={k} className="border rounded p-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="capitalize text-sm">{k}</Label>
                    <Switch checked={editingCard.metrics[k].enabled}
                      onCheckedChange={(v) => updateOverride(editingCard.id, { metrics: { ...editingCard.metrics, [k]: { ...editingCard.metrics[k], enabled: v } } })} />
                  </div>
                  {editingCard.metrics[k].enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" value={editingCard.metrics[k].min}
                        onChange={(e) => updateOverride(editingCard.id, { metrics: { ...editingCard.metrics, [k]: { ...editingCard.metrics[k], min: Number(e.target.value) || 1 } } })} />
                      <Input type="number" value={editingCard.metrics[k].max}
                        onChange={(e) => updateOverride(editingCard.id, { metrics: { ...editingCard.metrics, [k]: { ...editingCard.metrics[k], max: Number(e.target.value) || 1 } } })} />
                    </div>
                  )}
                </div>
              ))}
              <div>
                <Label className="text-xs">Timeframe</Label>
                <Select value={editingCard.timeframe}
                  onValueChange={(v) => updateOverride(editingCard.id, { timeframe: v as TimeframeType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Under 24 hours</SelectItem>
                    <SelectItem value="3d">1–3 days</SelectItem>
                    <SelectItem value="7d">3–7 days</SelectItem>
                    <SelectItem value="14d">7–14 days</SelectItem>
                    <SelectItem value="custom">Custom date</SelectItem>
                  </SelectContent>
                </Select>
                {editingCard.timeframe === "custom" && (
                  <Input type="datetime-local" className="mt-2" value={editingCard.customDate || ""}
                    onChange={(e) => updateOverride(editingCard.id, { customDate: e.target.value })} />
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => editingCard && setOverrides((p) => { const n = { ...p }; delete n[editingCard.id]; return n; })}>
              Reset
            </Button>
            <Button onClick={() => setEditingId(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- View Batch Dialog ---------- */}
      <Dialog open={!!viewingBatchId} onOpenChange={(o) => !o && setViewingBatchId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingBatch?.name}
              {viewingBatch && (
                <Badge className={STATUS_BADGE[viewingBatch.status]?.color}>{viewingBatch.status}</Badge>
              )}
            </DialogTitle>
            {viewingBatch && (
              <p className="text-xs text-muted-foreground">
                {viewingBatch.platform} • {viewingBatch.success_count}/{viewingBatch.total_count} ok • {viewingBatch.failed_count} failed • {format(new Date(viewingBatch.created_at), "PPp")}
              </p>
            )}
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-2 -mx-2 px-2">
            {(viewingItems || []).map((it: any) => {
              const cfg = STATUS_BADGE[it.status] || { color: "bg-gray-100 text-gray-700", icon: Clock };
              const Icon = cfg.icon;
              return (
                <div key={it.id} className="border rounded-lg p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <a href={it.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all flex-1">
                      {truncate(it.link, 80)}
                    </a>
                    <Badge className={cfg.color}>
                      <Icon className="w-3 h-3 mr-1" /> {it.status}
                    </Badge>
                  </div>
                  {it.engagement_order_number && (
                    <RouterLink to={`/engagement-orders/${it.engagement_order_number}`}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                      Order #{it.engagement_order_number} <ExternalLink className="w-3 h-3" />
                    </RouterLink>
                  )}
                  {it.error_message && (
                    <p className="text-xs text-red-600 mt-1">⚠ {it.error_message}</p>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            {viewingBatch && (
              <Button variant="outline" onClick={() => downloadBatchCsv(viewingBatch.id, viewingBatch.name)}>
                <Download className="w-4 h-4 mr-1" /> Download CSV
              </Button>
            )}
            <Button onClick={() => setViewingBatchId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
