import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionCheckDialog } from '@/components/subscription/SubscriptionCheckDialog';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Instagram, Loader2, Plus, Trash2, CheckCircle2, ShieldAlert, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function InstagramPage() {
  const { user } = useAuth();
  const { hasActiveSubscription, isLoading: subLoading } = useSubscription();
  const [showSubDialog, setShowSubDialog] = useState(false);
  const qc = useQueryClient();
  const [username, setUsername] = useState('');

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['ig-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_accounts').select('*')
        .eq('user_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const linkMut = useMutation({
    mutationFn: async (u: string) => {
      const { data, error } = await supabase.functions.invoke('instagram-link-account', { body: { username: u } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (d) => {
      toast.success(`Linked @${d.account.username} · ${d.imported} posts imported`);
      setUsername('');
      qc.invalidateQueries({ queryKey: ['ig-accounts'] });
      qc.invalidateQueries({ queryKey: ['ig-posts-summary'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instagram_accounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Account removed');
      qc.invalidateQueries({ queryKey: ['ig-accounts'] });
      qc.invalidateQueries({ queryKey: ['ig-posts-summary'] });
    },
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-purple-600/15 via-fuchsia-500/10 to-transparent border border-purple-400/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg">
              <Instagram className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold !text-white">Instagram Accounts</h1>
              <p className="text-sm text-white/60">Link your IG account to import posts and boost engagement.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-[#0a0a14]/80 border border-white/10">
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/50 mb-2">Add Instagram Username</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && username && linkMut.mutate(username)}
                placeholder="your_username"
                className="w-full h-11 pl-8 pr-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/40"
              />
            </div>
            <button
              disabled={!username || linkMut.isPending}
              onClick={() => linkMut.mutate(username)}
              className="h-11 px-5 rounded-xl font-semibold bg-gradient-to-b from-purple-500 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {linkMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Link
            </button>
          </div>
          <p className="mt-2 text-[11px] text-white/40 flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3" /> Read-only. We only fetch public profile info & posts.
          </p>
        </div>

        <div className="space-y-3">
          {isLoading && <div className="text-center text-white/50 py-8">Loading...</div>}
          {!isLoading && accounts.length === 0 && (
            <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 text-white/40">
              No Instagram accounts linked yet.
            </div>
          )}
          {accounts.map((a: any) => (
            <div key={a.id} className="rounded-2xl p-4 bg-[#0a0a14]/80 border border-white/10 flex items-center gap-4">
              {a.avatar_url ? (
                <img src={`https://lvrbhgulxqdsamhdjzkw.supabase.co/functions/v1/ig-image-proxy?url=${encodeURIComponent(a.avatar_url)}`} alt={a.username} referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-400/30" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                  {a.username[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold !text-white truncate">@{a.username}</span>
                  {a.is_verified && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                </div>
                {a.full_name && <p className="text-[13px] text-white/60 truncate">{a.full_name}</p>}
                <p className="text-[11px] text-white/40 mt-0.5">
                  {a.followers?.toLocaleString('en-IN') ?? 0} followers · {a.posts_count ?? 0} posts
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/my-posts?account=${encodeURIComponent(a.id)}`} className="px-3 h-9 rounded-lg text-[12px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center">
                  View Posts
                </Link>
                <button
                  onClick={() => confirm(`Remove @${a.username}?`) && removeMut.mutate(a.id)}
                  className="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-400/20 text-red-300 flex items-center justify-center"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
