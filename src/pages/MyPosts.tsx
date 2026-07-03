import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Grid3x3, ExternalLink, Rocket, Sparkles, PlayCircle, Image as ImageIcon, Layers, RefreshCw, Loader2, Instagram } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';

type Row = {
  media_id: string;
  shortcode: string | null;
  permalink: string;
  thumbnail_url: string | null;
  media_type: string | null;
  caption: string | null;
  posted_at: string | null;
  account_username: string | null;
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  total_spent: number;
};

function TypeIcon({ t }: { t: string | null }) {
  if (t === 'reel' || t === 'video') return <PlayCircle className="w-3.5 h-3.5" />;
  if (t === 'carousel') return <Layers className="w-3.5 h-3.5" />;
  return <ImageIcon className="w-3.5 h-3.5" />;
}

export default function MyPosts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [refreshing, setRefreshing] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ig-posts-summary', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_posts_with_order_summary', { _user_id: user!.id });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    enabled: !!user?.id,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['ig-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('instagram_accounts').select('id,username').eq('user_id', user!.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  // realtime: any engagement order change → refetch
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`eo-mypost-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagement_orders', filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ['ig-posts-summary'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const importAll = async () => {
    if (accounts.length === 0) {
      toast.error('Link an Instagram account first');
      navigate('/instagram');
      return;
    }
    setRefreshing(true);
    try {
      let total = 0;
      for (const a of accounts) {
        const { data, error } = await supabase.functions.invoke('instagram-refresh-media', {
          body: { account_id: a.id, results_limit: 100 },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        total += (data?.imported ?? 0) + (data?.updated ?? 0);
      }
      toast.success(`Imported/updated ${total} posts`);
      qc.invalidateQueries({ queryKey: ['ig-posts-summary'] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-3xl p-5 bg-gradient-to-br from-purple-600/15 via-fuchsia-500/10 to-transparent border border-purple-400/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shrink-0">
            <Grid3x3 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold !text-white">Post Command Center</h1>
            <p className="text-[13px] text-white/60">Boost engagement on any of your Instagram posts.</p>
          </div>
          <button
            onClick={importAll}
            disabled={refreshing}
            className="h-10 px-4 rounded-xl font-semibold text-[13px] bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Import All
          </button>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <div className="text-center py-14 rounded-2xl border border-dashed border-white/10 space-y-3">
            <Instagram className="w-10 h-10 text-white/30 mx-auto" />
            <p className="text-white/50 text-sm">No posts imported yet.</p>
            <Link to="/instagram" className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white text-sm font-semibold">
              Link Instagram Account
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {rows.map((r) => (
            <div key={r.media_id} className="rounded-2xl overflow-hidden bg-[#0a0a14]/80 border border-white/10 hover:border-purple-400/30 transition-colors group">
              <div className="relative aspect-square bg-black">
                {r.thumbnail_url ? (
                  <img src={`https://lvrbhgulxqdsamhdjzkw.supabase.co/functions/v1/ig-image-proxy?url=${encodeURIComponent(r.thumbnail_url)}`} alt="" loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20"><ImageIcon className="w-10 h-10" /></div>
                )}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 h-6 rounded-full bg-black/70 backdrop-blur text-[10px] font-semibold text-white/90 uppercase">
                  <TypeIcon t={r.media_type} /> {r.media_type ?? 'post'}
                </div>
                <a href={r.permalink} target="_blank" rel="noopener noreferrer"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur flex items-center justify-center text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2">
                  {r.active_orders > 0 && (
                    <span className="px-2 h-6 rounded-full bg-amber-500/90 text-black text-[10px] font-bold flex items-center">
                      Active {r.active_orders}
                    </span>
                  )}
                  {r.completed_orders > 0 && (
                    <span className="px-2 h-6 rounded-full bg-emerald-500/90 text-black text-[10px] font-bold flex items-center">
                      ✓ {r.completed_orders}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-[11px] text-white/50 line-clamp-2 min-h-[2.4em]">{r.caption || '—'}</p>
                <div className="flex items-center justify-between text-[10px] text-white/40">
                  <span>@{r.account_username}</span>
                  {r.total_spent > 0 && <span className="text-emerald-300/80 font-semibold">{formatPrice(Number(r.total_spent))}</span>}
                </div>
                <button
                  onClick={() => navigate(`/engagement-order?link=${encodeURIComponent(r.permalink)}`)}
                  className="w-full h-9 rounded-lg text-[12px] font-semibold bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center justify-center gap-1.5"
                >
                  <Rocket className="w-3.5 h-3.5" /> Boost
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
