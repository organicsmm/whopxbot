import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { PlatformSelector } from "@/components/engagement/PlatformSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rocket, Trash2, Pencil, Link as LinkIcon, AlertCircle } from "lucide-react";

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
  customDate?: string; // ISO
  // Resolved random values used for preview / submission
  resolved: {
    views: number;
    metrics: Partial<Record<MetricKey, number>>;
    hours: number;
  };
}

// ---------- Helpers ----------
const isValidUrl = (s: string) => {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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

// ---------- Page ----------
export default function MassOrder() {
  const navigate = useNavigate();
  const { user, wallet, refreshWallet } = useAuth();
  const { formatPrice } = useCurrency();
  const { applyMarkup } = useGlobalMarkup();
  const { toast } = useToast();

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

  // Bundles for selected platform (same shape as EngagementOrder)
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

  // type -> { serviceId, pricePerK, minQty }
  const serviceMap = useMemo(() => {
    const m: Record<string, { serviceId: string | null; pricePerK: number; minQty: number }> = {};
    bundle?.items?.forEach((it: any) => {
      const pricePerK = it.price_per_k != null && Number(it.price_per_k) > 0
        ? Number(it.price_per_k)
        : (it.service?.price ?? 0);
      m[it.engagement_type] = {
        serviceId: it.service?.id ?? it.service_id ?? null,
        pricePerK,
        minQty: it.service?.min_quantity ?? 0,
      };
    });
    return m;
  }, [bundle]);

  // Parse links
  const parsedLinks = useMemo(() => {
    return linksText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [linksText]);

  const linkValidity = useMemo(() => parsedLinks.map(isValidUrl), [parsedLinks]);
  const validLinks = useMemo(
     () => parsedLinks.filter((_, i) => linkValidity[i]),
     [parsedLinks, linkValidity]
  );

  // Build cards (deterministic id per link index)
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
      METRIC_KEYS.forEach((k) => {
        if (mts[k]?.enabled) resolvedMetrics[k] = randInt(mts[k].min, mts[k].max);
      });
      return {
        id,
        link,
        views: v,
        metrics: mts,
        timeframe: tf,
        customDate: cd,
        resolved: { views: resolvedViews, metrics: resolvedMetrics, hours },
      };
    });
    // Note: resolved values intentionally regenerate when config changes — gives a "live preview" feel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validLinks, overrides, views, metrics, timeframe, customDate]);

  // Pricing per card
  const cardCost = useCallback((c: CardData) => {
    const types: { type: string; qty: number }[] = [{ type: "views", qty: c.resolved.views }];
    METRIC_KEYS.forEach((k) => {
      const q = c.resolved.metrics[k];
      if (q) types.push({ type: k, qty: q });
    });
    let total = 0;
    for (const t of types) {
      const s = serviceMap[t.type];
      if (!s) continue;
      total += (t.qty / 1000) * applyMarkup(s.pricePerK);
    }
    return total;
  }, [serviceMap, applyMarkup]);

  const totalCost = useMemo(() => cards.reduce((sum, c) => sum + cardCost(c), 0), [cards, cardCost]);

  // Validation
  const errors = useMemo(() => {
    const list: string[] = [];
    if (parsedLinks.length === 0) list.push("Add at least 1 link.");
    if (parsedLinks.some((_, i) => !linkValidity[i])) list.push("One or more links are invalid (must start with http/https).");
    const uniqueCount = new Set(validLinks).size;
    if (uniqueCount !== validLinks.length) list.push("Duplicate links detected.");
    if (!(views.min > 0 && views.max > 0 && views.min <= views.max)) list.push("Views range invalid.");
    METRIC_KEYS.forEach((k) => {
      const m = metrics[k];
      if (m.enabled && !(m.min > 0 && m.max > 0 && m.min <= m.max)) list.push(`${k} range invalid.`);
    });
    if (timeframe === "custom" && !customDate) list.push("Pick a custom deadline date.");
    if (!serviceMap["views"]) list.push(`No "views" service configured for ${platform} bundle.`);
    if (wallet && wallet.balance < totalCost) list.push(`Insufficient balance. Need ${formatPrice(totalCost)}, have ${formatPrice(wallet.balance)}.`);
    return list;
  }, [parsedLinks, linkValidity, validLinks, views, metrics, timeframe, customDate, serviceMap, platform, wallet, totalCost, formatPrice]);

  const canSubmit = errors.length === 0 && cards.length > 0 && !submitting;

  // ---------- Submit ----------
  const handleSubmitAll = async () => {
    if (!user || !canSubmit || !bundle) return;
    setSubmitting(true);
    setProgress({ done: 0, total: cards.length });
    const results: { link: string; ok: boolean; error?: string; orderNumber?: number }[] = [];

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      try {
        const engagements: any[] = [];
        const pushType = (type: string, qty: number) => {
          const s = serviceMap[type];
          if (!s || !s.serviceId || qty <= 0) return;
          const price = (qty / 1000) * applyMarkup(s.pricePerK);
          engagements.push({
            type,
            quantity: qty,
            price,
            service_id: s.serviceId,
            time_limit_hours: c.resolved.hours,
            variance_percent: 15,
            peak_hours_enabled: true,
          });
        };
        pushType("views", c.resolved.views);
        METRIC_KEYS.forEach((k) => {
          const q = c.resolved.metrics[k];
          if (q) pushType(k, q);
        });

        const totalPrice = engagements.reduce((s, e) => s + e.price, 0);

        const { data, error } = await supabase.functions.invoke("process-engagement-order", {
          body: {
            user_id: user.id,
            bundle_id: bundle.id,
            link: c.link,
            campaign_name: null,
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
            } catch {/* ignore */}
          }
          throw new Error(message);
        }
        if ((data as any)?.error) throw new Error((data as any).error);
        results.push({ link: c.link, ok: true, orderNumber: (data as any)?.order_number });
      } catch (e: any) {
        results.push({ link: c.link, ok: false, error: e?.message || "Failed" });
      }
      setProgress({ done: i + 1, total: cards.length });
      refreshWallet();
    }

    setSubmitting(false);
    const okCount = results.filter((r) => r.ok).length;
    const failCount = results.length - okCount;
    if (failCount === 0) {
      toast({ title: "🚀 Mass Order Complete", description: `${okCount} orders submitted successfully.` });
      navigate("/engagement-orders");
    } else {
      toast({
        title: `${okCount} submitted, ${failCount} failed`,
        description: results.filter((r) => !r.ok).slice(0, 3).map((r) => `${truncate(r.link, 30)}: ${r.error}`).join(" • "),
        variant: "destructive",
      });
    }
  };

  // ---------- Edit dialog ----------
  const editingCard = cards.find((c) => c.id === editingId) || null;
  const updateOverride = (id: string, patch: Partial<CardData>) =>
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  const removeLink = (link: string) => {
    setLinksText((t) => t.split(/\r?\n/).filter((l) => l.trim() !== link).join("\n"));
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Rocket className="w-6 h-6 text-orange-500" /> Mass Order</h1>
            <p className="text-sm text-muted-foreground">Submit engagement orders for multiple links in one go.</p>
          </div>
          <Badge variant="outline" className="text-sm">
            Total: <span className="font-bold ml-1">{formatPrice(totalCost)}</span>
          </Badge>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* LEFT: config */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Platform & Links</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <PlatformSelector selected={platform} onSelect={setPlatform} />
                <div>
                  <Label className="text-xs">Links (one per line)</Label>
                  <Textarea
                    value={linksText}
                    onChange={(e) => setLinksText(e.target.value)}
                    placeholder={"https://instagram.com/reel/...\nhttps://instagram.com/reel/..."}
                    rows={6}
                    className="font-mono text-sm mt-1"
                  />
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
                      <Switch
                        checked={metrics[k].enabled}
                        onCheckedChange={(v) => setMetrics((m) => ({ ...m, [k]: { ...m[k], enabled: v } }))}
                      />
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
                      <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> No "{k}" service in {platform} bundle — will be skipped.</p>
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
                    <p key={i} className="text-xs text-amber-900 flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {e}</p>
                  ))}
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
                Paste links on the left to see live preview cards here.
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
      </div>

      {/* Edit Dialog */}
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
                  <Input type="datetime-local" className="mt-2"
                    value={editingCard.customDate || ""}
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
    </DashboardLayout>
  );
}
