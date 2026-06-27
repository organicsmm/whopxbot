import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, Wallet, TrendingUp, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const INR_RATE = 83.5;

// INR-only mode: internal values stored as USD, displayed everywhere as INR.
const inr = (n: number) =>
  `₹${Math.round((n || 0) * INR_RATE).toLocaleString("en-IN")}`;
const inrFromAny = (n: number, currency?: string | null) => {
  const code = (currency || "").toUpperCase();
  // Provider balances may already be in INR; otherwise treat as USD and convert.
  if (code === "INR") return `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
  return inr(n);
};
const num = (n: number) => (n || 0).toLocaleString("en-IN");

type PlanRow = {
  provider_account_id: string;
  provider_id: string;
  provider_name: string;
  pending_runs: number;
  pending_user_usd: number;
  markup_percent: number;
};

type BreakdownRow = {
  provider_account_id: string;
  provider_id: string;
  provider_name: string;
  service_id: string;
  service_name: string;
  service_category: string | null;
  pending_runs: number;
  pending_quantity: number;
  pending_user_usd: number;
};

type ProviderAccount = {
  id: string;
  provider_id: string;
  name: string;
  is_active: boolean;
  balance: number | null;
  balance_currency: string | null;
  balance_checked_at: string | null;
  last_balance_error: string | null;
};

function categoryColor(cat: string | null): string {
  const k = (cat || "").toLowerCase();
  if (k.includes("tiktok")) return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
  if (k.includes("instagram")) return "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30";
  if (k.includes("youtube")) return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";
  if (k.includes("facebook")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
  if (k.includes("twitter") || k.includes("x ")) return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
  if (k.includes("telegram")) return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export default function AdminTopupPlan() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const plan = useQuery({
    queryKey: ["topup-plan"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_provider_topup_plan");
      if (error) throw error;
      return (data || []) as PlanRow[];
    },
    refetchInterval: 60_000,
  });

  const breakdown = useQuery({
    queryKey: ["topup-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_provider_topup_breakdown");
      if (error) throw error;
      return (data || []) as BreakdownRow[];
    },
    refetchInterval: 60_000,
  });

  const accounts = useQuery({
    queryKey: ["topup-provider-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_accounts")
        .select("id,provider_id,name,is_active,balance,balance_currency,balance_checked_at,last_balance_error")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as ProviderAccount[];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (plan.dataUpdatedAt) setLastRefresh(new Date(plan.dataUpdatedAt));
  }, [plan.dataUpdatedAt]);

  // Realtime: any change to organic_run_schedule invalidates the planner
  useEffect(() => {
    const channel = supabase
      .channel("topup-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organic_run_schedule" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["topup-plan"] });
          queryClient.invalidateQueries({ queryKey: ["topup-breakdown"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const planByAccount = useMemo(() => {
    const m = new Map<string, PlanRow>();
    (plan.data || []).forEach((r) => m.set(r.provider_account_id, r));
    return m;
  }, [plan.data]);

  const breakdownByAccount = useMemo(() => {
    const m = new Map<string, BreakdownRow[]>();
    (breakdown.data || []).forEach((r) => {
      const arr = m.get(r.provider_account_id) || [];
      arr.push(r);
      m.set(r.provider_account_id, arr);
    });
    return m;
  }, [breakdown.data]);

  const markup = plan.data?.[0]?.markup_percent ?? 0;
  const totalPendingUsd = (plan.data || []).reduce((s, r) => s + Number(r.pending_user_usd || 0), 0);
  const totalPendingCost = totalPendingUsd / (1 + Number(markup) / 100);

  const needTopUpCount = useMemo(() => {
    let n = 0;
    (accounts.data || []).forEach((a) => {
      const row = planByAccount.get(a.id);
      const cost = row ? Number(row.pending_user_usd) / (1 + Number(row.markup_percent) / 100) : 0;
      if ((a.balance ?? 0) < cost) n += 1;
    });
    return n;
  }, [accounts.data, planByAccount]);

  const largestBucket = useMemo(() => {
    let best: BreakdownRow | null = null;
    (breakdown.data || []).forEach((r) => {
      if (!best || Number(r.pending_user_usd) > Number(best.pending_user_usd)) best = r;
    });
    return best;
  }, [breakdown.data]);

  const refreshAll = () => {
    plan.refetch();
    breakdown.refetch();
    accounts.refetch();
  };

  const loading = plan.isLoading || breakdown.isLoading || accounts.isLoading;

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  Provider Top-Up Plan
                </h1>
                <p className="text-sm text-muted-foreground">
                  Live view of pending load vs. provider balances. Numbers tick down as runs dispatch.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Updates every 60s</Badge>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })}
              </span>
              <Button size="sm" variant="outline" onClick={refreshAll} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Total Pending (user-facing)</div>
                <div className="text-xl font-bold mt-1">{inr(totalPendingUsd)}</div>
                <div className="text-xs text-muted-foreground">All amounts in INR</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Providers needing top-up</div>
                <div className={cn("text-xl font-bold mt-1", needTopUpCount > 0 ? "text-destructive" : "text-success")}>
                  {needTopUpCount} / {(accounts.data || []).length}
                </div>
                <div className="text-xs text-muted-foreground">Balance &lt; pending cost</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Largest pending bucket</div>
                {largestBucket ? (
                  <>
                    <div className="text-sm font-semibold mt-1 truncate">{largestBucket.provider_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {largestBucket.service_name} — {inr(Number(largestBucket.pending_user_usd))}
                    </div>
                  </>
                ) : (
                  <div className="text-sm mt-1 text-muted-foreground">—</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Section A: Provider balance cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Wallet className="h-5 w-5" /> Provider Balances
            </h2>
            {accounts.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(accounts.data || []).map((a) => {
                  const row = planByAccount.get(a.id);
                  const userUsd = row ? Number(row.pending_user_usd) : 0;
                  const cost = userUsd / (1 + Number(row?.markup_percent ?? markup) / 100);
                  const delta = (a.balance ?? 0) - cost;
                  const stale = !a.balance_checked_at || (Date.now() - new Date(a.balance_checked_at).getTime() > 5 * 60_000);
                  const healthy = !a.last_balance_error && !stale;
                  return (
                    <Card key={a.id} className="glass-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base truncate">{a.name}</CardTitle>
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full",
                              healthy ? "bg-success" : "bg-destructive"
                            )}
                            title={healthy ? "Fresh" : "Stale / error"}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">{a.provider_id}</div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <div className="text-xs text-muted-foreground">Balance</div>
                          <div className="text-2xl font-bold">
                            {a.balance != null ? inrFromAny(a.balance, a.balance_currency) : "—"}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Pending cost</div>
                            <div className="font-semibold">{inr(cost)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Delta</div>
                            <div className={cn("font-semibold", delta >= 0 ? "text-success" : "text-destructive")}>
                              {delta >= 0 ? inr(delta) : `-${inr(Math.abs(delta))}`}
                            </div>
                          </div>
                        </div>
                        {delta < 0 && (
                          <div className="text-xs px-2 py-1.5 rounded-md bg-destructive/10 text-destructive font-medium">
                            TOP UP {inr(Math.abs(delta))} needed
                          </div>
                        )}
                        <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>
                            {a.balance_checked_at
                              ? `Checked ${formatDistanceToNow(new Date(a.balance_checked_at), { addSuffix: true })}`
                              : "Never checked"}
                          </span>
                        </div>
                        {a.last_balance_error && (
                          <div className="text-xs text-destructive flex items-start gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span className="truncate">{a.last_balance_error}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {(accounts.data || []).length === 0 && (
                  <Card className="glass-card md:col-span-2 lg:col-span-3">
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      No active provider accounts configured.
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Section B: Planner table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Top-Up Planner</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {plan.isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (plan.data || []).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  ✅ All providers caught up — no pending load
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-2 w-8"></th>
                        <th className="text-left px-4 py-2">Provider</th>
                        <th className="text-right px-4 py-2">Pending runs</th>
                        <th className="text-right px-4 py-2">User (INR)</th>
                        <th className="text-right px-4 py-2">Provider cost (INR)</th>
                        </tr>
                    </thead>
                    <tbody>
                      {(plan.data || []).map((r) => {
                        const cost = Number(r.pending_user_usd) / (1 + Number(r.markup_percent) / 100);
                        const isOpen = !!expanded[r.provider_account_id];
                        const rows = breakdownByAccount.get(r.provider_account_id) || [];
                        return (
                          <>
                            <tr
                              key={r.provider_account_id}
                              className="border-t border-border hover:bg-muted/30 cursor-pointer"
                              onClick={() => setExpanded((s) => ({ ...s, [r.provider_account_id]: !isOpen }))}
                            >
                              <td className="px-4 py-2">
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </td>
                              <td className="px-4 py-2 font-medium">{r.provider_name}</td>
                              <td className="px-4 py-2 text-right">{num(r.pending_runs)}</td>
                              <td className="px-4 py-2 text-right">{inr(Number(r.pending_user_usd))}</td>
                              <td className="px-4 py-2 text-right">{inr(cost)}</td>
                              
                            </tr>
                            {isOpen && (
                              <tr key={r.provider_account_id + "-exp"} className="bg-muted/10">
                                <td></td>
                                <td colSpan={4} className="px-4 py-3">
                                  {rows.length === 0 ? (
                                    <div className="text-xs text-muted-foreground">No breakdown.</div>
                                  ) : (
                                    <table className="w-full text-xs">
                                      <thead className="text-muted-foreground">
                                        <tr>
                                          <th className="text-left py-1">Service</th>
                                          <th className="text-right py-1">Runs</th>
                                          <th className="text-right py-1">Quantity</th>
                                          <th className="text-right py-1">User (INR)</th>
                                          <th className="text-right py-1">Cost (INR)</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.map((b) => {
                                          const bcost = Number(b.pending_user_usd) / (1 + Number(r.markup_percent) / 100);
                                          return (
                                            <tr key={b.service_id} className="border-t border-border/50">
                                              <td className="py-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">{b.service_name}</span>
                                                  {b.service_category && (
                                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", categoryColor(b.service_category))}>
                                                      {b.service_category}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="py-1 text-right">{num(b.pending_runs)}</td>
                                              <td className="py-1 text-right">{num(b.pending_quantity)}</td>
                                              <td className="py-1 text-right">{inr(Number(b.pending_user_usd))}</td>
                                              <td className="py-1 text-right text-muted-foreground">{inr(bcost)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/30 text-xs">
                      <tr>
                        <td></td>
                        <td className="px-4 py-2 font-semibold">Total</td>
                        <td></td>
                        <td className="px-4 py-2 text-right font-semibold">{inr(totalPendingUsd)}</td>
                        <td className="px-4 py-2 text-right font-semibold">{inr(totalPendingCost)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-muted-foreground">{inr(totalPendingCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
