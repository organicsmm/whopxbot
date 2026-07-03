import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Grid3x3, ExternalLink, Rocket, PlayCircle, Image as ImageIcon, Layers, Instagram } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useCurrency } from '@/hooks/useCurrency';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Row = {
  media_id: string;
  shortcode: string | null;
  permalink: string;
  thumbnail_url: string | null;
  media_type: string | null;
  caption: string | null;
  posted_at: string | null;
  account_id: string | null;
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
  const { formatPrice } = useCurrency();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedAccountId = searchParams.get('account');
  const [manualLink, setManualLink] = useState('');

  const goBoost = (url: string) => navigate(`/engagement-order?link=${encodeURIComponent(url)}`);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['ig-posts-summary', user?.id, selectedAccountId],
    queryFn: async () => {
      let mediaQuery = supabase
        .from('instagram_media')
        .select('media_id,shortcode,permalink,thumbnail_url,media_type,caption,posted_at,account_id,instagram_accounts!inner(username)')
        .eq('user_id', user!.id)
        .order('posted_at', { ascending: false, nullsFirst: false });

      if (selectedAccountId) mediaQuery = mediaQuery.eq('account_id', selectedAccountId);

      const { data: media, error: mediaError } = await mediaQuery;
      if (mediaError) throw mediaError;

      const { data: orders, error: ordersError } = await supabase
        .from('engagement_orders')
        .select('link,status,total_price')
        .eq('user_id', user!.id);
      if (ordersError) throw ordersError;

      return (media ?? []).map((m: any) => {
        const matchingOrders = (orders ?? []).filter((o: any) => {
          if (!m.shortcode || !o.link) return false;
          return String(o.link).toLowerCase().includes(String(m.shortcode).toLowerCase());
        });

        return {
          media_id: m.media_id,
          shortcode: m.shortcode,
          permalink: m.permalink,
          thumbnail_url: m.thumbnail_url,
          media_type: m.media_type,
          caption: m.caption,
          posted_at: m.posted_at,
          account_id: m.account_id,
          account_username: m.instagram_accounts?.username ?? null,
          total_orders: matchingOrders.length,
          active_orders: matchingOrders.filter((o: any) => ['pending', 'processing'].includes(o.status)).length,
          completed_orders: matchingOrders.filter((o: any) => o.status === 'completed').length,
          total_spent: matchingOrders.reduce((sum: number, o: any) => sum + Number(o.total_price ?? 0), 0),
        } as Row;
      });
    },
    enabled: !!user?.id,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['ig-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('instagram_accounts').select('id,username').eq('user_id', user!.id).order('created_at', { ascending: false });
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

  const selectedAccount = selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="rounded-3xl p-5 bg-gradient-to-br from-purple-600/15 via-fuchsia-500/10 to-transparent border border-purple-400/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shrink-0">
            <Grid3x3 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold !text-white">{selectedAccount ? `@${selectedAccount.username} Posts` : 'Post Command Center'}</h1>
            <p className="text-[13px] text-white/60">{selectedAccount ? 'Only this account posts are showing.' : 'Boost engagement on any of your Instagram posts.'}</p>
          </div>
          <Link to="/instagram" className="h-10 px-4 rounded-xl font-semibold text-[13px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center shrink-0">
            Accounts
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Paste any Instagram reel/post link…"
            value={manualLink}
            onChange={(e) => setManualLink(e.target.value)}
            className="bg-black/30 border-white/10 text-white"
          />
          <Button
            onClick={() => { if (/instagram\.com\//i.test(manualLink)) goBoost(manualLink.trim()); }}
            disabled={!/instagram\.com\//i.test(manualLink)}
            className="bg-gradient-to-b from-purple-500 to-fuchsia-600"
          >
            <Rocket className="w-4 h-4 mr-1" /> Boost Link
          </Button>
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
            <p className="text-white/50 text-sm">No posts found for this account yet.</p>
            <Link to="/instagram" className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white text-sm font-semibold">
              Back to Instagram Accounts
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
                  onClick={() => goBoost(r.permalink)}
                  className="w-full h-9 rounded-lg text-[12px] font-semibold bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white shadow-md shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center justify-center gap-1.5"
                >
                  <Rocket className="w-3.5 h-3.5" /> Boost
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <QuickOrderSheet
        open={!!boostLink}
        onOpenChange={(v) => { if (!v) setBoostLink(null); }}
        link={boostLink ?? ''}
        onPlaced={() => { setManualLink(''); qc.invalidateQueries({ queryKey: ['ig-posts-summary'] }); }}
      />
    </DashboardLayout>

  );
}
