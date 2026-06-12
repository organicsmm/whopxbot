import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/hooks/useCurrency";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Droplets, Plus, Trash2, Pause, Play, Loader2, ExternalLink, AlertCircle, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Service {
  id: string;
  name: string;
  service_id: string;
  price: number;
  category: string;
  min_quantity: number;
  max_quantity: number;
}

interface Campaign {
  id: string;
  name: string | null;
  link: string;
  service_id: string;
  qty_per_run: number;
  interval_minutes: number;
  total_runs: number;
  runs_done: number;
  runs_failed: number;
  next_run_at: string;
  is_active: boolean;
  last_error: string | null;
  created_at: string;
}

export default function DripFeed() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    link: "",
    service_id: "",
    qty_per_run: 100,
    interval_minutes: 60,
    total_runs: 5,
  });

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["drip-campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drip_feed_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Campaign[];
    },
    enabled: !!user,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id,name,service_id,price,category,min_quantity,max_quantity")
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return (data || []) as Service[];
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!form.link.trim()) throw new Error("Link required");
      if (!form.service_id) throw new Error("Pick a service");
      if (form.qty_per_run <= 0) throw new Error("Invalid qty");
      if (form.total_runs <= 0) throw new Error("Invalid runs");
      if (form.interval_minutes < 5) throw new Error("Min interval 5 min");
      const { error } = await supabase.from("drip_feed_campaigns").insert({
        user_id: user!.id,
        name: form.name || null,
        link: form.link.trim(),
        service_id: form.service_id,
        qty_per_run: form.qty_per_run,
        interval_minutes: form.interval_minutes,
        total_runs: form.total_runs,
        next_run_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Drip campaign created" });
      setOpen(false);
      setForm({ name: "", link: "", service_id: "", qty_per_run: 100, interval_minutes: 60, total_runs: 5 });
      qc.invalidateQueries({ queryKey: ["drip-campaigns"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const patch: Record<string, unknown> = { is_active: active };
      if (active) patch.next_run_at = new Date().toISOString();
      const { error } = await supabase.from("drip_feed_campaigns").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drip-campaigns"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("drip_feed_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Campaign deleted" });
      qc.invalidateQueries({ queryKey: ["drip-campaigns"] });
    },
  });

  const selectedSvc = services.find((s) => s.id === form.service_id);
  const estPerRun = selectedSvc ? (form.qty_per_run / 1000) * Number(selectedSvc.price) : 0;
  const estTotal = estPerRun * form.total_runs;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Droplets className="w-6 h-6 text-sky-600" /> Drip-Feed Campaigns
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule auto-orders every X minutes for steady, organic growth.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5 bg-sky-600 hover:bg-sky-700">
                <Plus className="w-4 h-4" /> New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Drip Campaign</DialogTitle>
                <DialogDescription className="text-xs">
                  Fires {form.total_runs} orders of {form.qty_per_run} every {form.interval_minutes} min.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Campaign name (optional)</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My reel boost" />
                </div>
                <div>
                  <Label className="text-xs">Post / Profile Link</Label>
                  <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label className="text-xs">Service</Label>
                  <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick service" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.category} — {s.name} ({formatPrice(Number(s.price))}/1k)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Qty / run</Label>
                    <Input type="number" min={1} value={form.qty_per_run} onChange={(e) => setForm({ ...form, qty_per_run: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Interval (min)</Label>
                    <Input type="number" min={5} value={form.interval_minutes} onChange={(e) => setForm({ ...form, interval_minutes: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Total runs</Label>
                    <Input type="number" min={1} max={500} value={form.total_runs} onChange={(e) => setForm({ ...form, total_runs: Number(e.target.value) })} />
                  </div>
                </div>
                {selectedSvc && (
                  <div className="rounded-lg bg-sky-50 border border-sky-200 p-2 text-[11px] text-sky-900">
                    Per run ≈ <b>{formatPrice(estPerRun)}</b> · Total est. <b>{formatPrice(estTotal)}</b>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} className="bg-sky-600 hover:bg-sky-700">
                  {createMut.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : campaigns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Droplets className="w-10 h-10 mx-auto text-sky-300 mb-3" />
              <p className="text-sm font-medium">No drip campaigns yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create one to auto-fire orders on a schedule.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {campaigns.map((c) => {
              const pct = c.total_runs > 0 ? (c.runs_done / c.total_runs) * 100 : 0;
              const done = c.runs_done >= c.total_runs;
              return (
                <Card key={c.id} className={done ? "opacity-80" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{c.name || "Drip campaign"}</CardTitle>
                        <a href={c.link} target="_blank" rel="noreferrer" className="text-[10px] text-sky-600 hover:underline inline-flex items-center gap-1 truncate max-w-[200px]">
                          <ExternalLink className="w-2.5 h-2.5" /> {c.link}
                        </a>
                      </div>
                      <Badge variant={done ? "secondary" : c.is_active ? "default" : "outline"} className="text-[10px]">
                        {done ? "Done" : c.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{c.runs_done}/{c.total_runs} runs · {c.qty_per_run}/run · every {c.interval_minutes}m</span>
                      <span className="font-semibold">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    {!done && c.is_active && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Next: {formatDistanceToNow(new Date(c.next_run_at), { addSuffix: true })}
                      </p>
                    )}
                    {c.last_error && (
                      <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded p-1.5 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {c.last_error}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <Switch
                        checked={c.is_active && !done}
                        disabled={done}
                        onCheckedChange={(v) => toggleMut.mutate({ id: c.id, active: v })}
                      />
                      <Button size="sm" variant="ghost" className="h-7 text-red-600 hover:bg-red-50" onClick={() => {
                        if (confirm("Delete this campaign?")) deleteMut.mutate(c.id);
                      }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
