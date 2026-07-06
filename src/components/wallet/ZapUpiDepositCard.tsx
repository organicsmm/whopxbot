import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const MIN_AMOUNT = 50;
const MAX_AMOUNT = 100000;

export default function ZapUpiDepositCard() {
  const [amount, setAmount] = useState<string>('500');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const polledRef = useRef<string | null>(null);

  useEffect(() => {
    const deposit = searchParams.get('deposit');
    const orderId = searchParams.get('order_id');
    if (!deposit || !orderId) return;
    if (!orderId.startsWith('zap_')) return;
    if (polledRef.current === orderId) return;
    polledRef.current = orderId;

    if (deposit === 'failed') { toast.error('Payment failed. Please try again.'); clearParams(); return; }
    if (deposit === 'timeout') { toast.error('Payment timed out. If deducted, will reflect shortly.'); clearParams(); pollUntilCredited(orderId); return; }
    if (deposit === 'success') pollUntilCredited(orderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function clearParams() {
    const next = new URLSearchParams(searchParams);
    next.delete('deposit'); next.delete('order_id');
    setSearchParams(next, { replace: true });
  }

  async function pollUntilCredited(orderId: string) {
    setPolling(true);
    const start = Date.now();
    const MAX_MS = 60_000; const INTERVAL = 3_000;
    toast.loading('Verifying payment…', { id: `zap-${orderId}` });
    while (Date.now() - start < MAX_MS) {
      try {
        const { data, error } = await supabase.functions.invoke('zapupi-sync-deposit', { body: { order_id: orderId } });
        if (error) throw error;
        if (data?.status === 'success' || data?.credited) {
          toast.success('🎉 Wallet credited successfully!', { id: `zap-${orderId}` });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          clearParams(); setPolling(false); return;
        }
        if (data?.status === 'failed') { toast.error('Payment failed.', { id: `zap-${orderId}` }); clearParams(); setPolling(false); return; }
      } catch (e) { console.error('sync error', e); }
      await new Promise((r) => setTimeout(r, INTERVAL));
    }
    toast.error('Could not confirm payment in time. If deducted, credit will follow automatically.', { id: `zap-${orderId}` });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    clearParams(); setPolling(false);
  }

  async function handlePay() {
    const inr = Math.floor(Number(amount) || 0);
    if (!inr || inr < MIN_AMOUNT) return toast.error(`Minimum deposit is ₹${MIN_AMOUNT}`);
    if (inr > MAX_AMOUNT) return toast.error(`Maximum deposit is ₹${MAX_AMOUNT}`);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zapupi-create-order', { body: { amount_inr: inr } });
      if (error) throw error;
      if (!data?.payment_url) throw new Error(data?.error || 'No payment URL');
      window.location.href = data.payment_url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start payment');
      setLoading(false);
    }
  }

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-[#160b2e] to-[#0f0824] border border-violet-500/15 p-6 shadow-2xl shadow-violet-950/40 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 bg-violet-500/20 blur-[100px] rounded-full" />

      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Pay with UPI</h3>
            <p className="text-[11px] text-violet-300/60 mt-0.5">GPay · PhonePe · Paytm · BHIM</p>
          </div>
        </div>
        <span className="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[9px] font-bold uppercase tracking-wider">
          Instant
        </span>
      </div>

      <div className="relative space-y-4">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300/60 ml-1">Amount</label>
          <div className="mt-1.5 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-violet-400/70">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-[#07040f] border border-violet-500/20 rounded-2xl py-4 pl-11 pr-16 text-2xl font-extrabold tracking-tight text-white outline-none focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)] transition-all placeholder:text-slate-700"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-violet-300/50 tracking-wider">INR</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((q) => {
            const active = Number(amount) === q;
            return (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className={
                  'py-2.5 rounded-xl text-xs font-bold transition-all border ' +
                  (active
                    ? 'bg-violet-500/25 border-violet-400/50 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                    : 'bg-white/[0.03] border-white/5 text-violet-200/80 hover:bg-violet-500/15 hover:border-violet-500/30 hover:text-white')
                }
              >
                ₹{q >= 1000 ? `${q / 1000}k` : q}
              </button>
            );
          })}
        </div>

        <button
          onClick={handlePay}
          disabled={loading || polling}
          className="relative w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 overflow-hidden bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 shadow-lg shadow-violet-900/50 hover:shadow-violet-900/70"
        >
          <span aria-hidden className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)', backgroundSize: '200% 100%', animation: 'vault-shine 2.5s linear infinite' }} />
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin relative" /> <span className="relative">Opening UPI…</span></>)
            : polling ? (<><Loader2 className="w-4 h-4 animate-spin relative" /> <span className="relative">Verifying…</span></>)
            : (<><Zap className="w-4 h-4 relative" fill="white" /> <span className="relative">Pay ₹{Math.floor(Number(amount) || 0)} via UPI</span></>)}
        </button>

        <div className="flex items-center justify-center gap-1.5 pt-1">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[10px] text-slate-500 font-medium">Auto-credit in seconds · No manual approval</p>
        </div>
      </div>
    </div>
  );
}
