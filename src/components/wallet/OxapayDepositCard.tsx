import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bitcoin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const QUICK_AMOUNTS = [500, 1000, 5000, 10000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 500000;

export default function OxapayDepositCard() {
  const [amount, setAmount] = useState<string>('1000');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const polledRef = useRef<string | null>(null);

  useEffect(() => {
    const deposit = searchParams.get('deposit');
    const orderId = searchParams.get('order_id');
    if (!deposit || !orderId || !orderId.startsWith('oxw_')) return;
    if (polledRef.current === orderId) return;
    polledRef.current = orderId;
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
    const start = Date.now(); const MAX_MS = 120_000; const INTERVAL = 4_000;
    toast.loading('Verifying crypto payment…', { id: `ox-${orderId}` });
    while (Date.now() - start < MAX_MS) {
      try {
        const { data } = await supabase.functions.invoke('oxapay-sync-deposit', { body: { order_id: orderId } });
        if (data?.credited || data?.status === 'success') {
          toast.success('🎉 Wallet credited!', { id: `ox-${orderId}` });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          clearParams(); setPolling(false); return;
        }
        if (data?.status === 'failed') { toast.error('Payment expired.', { id: `ox-${orderId}` }); clearParams(); setPolling(false); return; }
      } catch (e) { console.error('sync error', e); }
      await new Promise((r) => setTimeout(r, INTERVAL));
    }
    toast.dismiss(`ox-${orderId}`);
    toast.message('Still waiting for blockchain confirmation. It will credit automatically.');
    clearParams(); setPolling(false);
  }

  async function handlePay() {
    const inr = Math.floor(Number(amount) || 0);
    if (!inr || inr < MIN_AMOUNT) return toast.error(`Minimum is ₹${MIN_AMOUNT}`);
    if (inr > MAX_AMOUNT) return toast.error(`Maximum is ₹${MAX_AMOUNT}`);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('oxapay-create-wallet-topup', { body: { amount_inr: inr } });
      if (error) throw error;
      if (!data?.payment_url) throw new Error(data?.error || 'No payment URL');
      window.location.href = data.payment_url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start payment');
      setLoading(false);
    }
  }

  const usd = (Number(amount || 0) / 83.5).toFixed(2);

  return (
    <div className="relative rounded-3xl bg-gradient-to-br from-[#0b0a2e] to-[#0f0824] border border-indigo-500/15 p-6 shadow-2xl shadow-indigo-950/40 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 bg-indigo-500/20 blur-[100px] rounded-full" />

      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <Bitcoin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Pay with Crypto</h3>
            <p className="text-[11px] text-indigo-300/60 mt-0.5">USDT · BTC · LTC · TRX · ETH</p>
          </div>
        </div>
        <div className="flex -space-x-1.5">
          <div className="w-6 h-6 rounded-full bg-[#26a17b] border-2 border-[#0f0824] flex items-center justify-center text-[8px] font-bold text-white">T</div>
          <div className="w-6 h-6 rounded-full bg-[#f7931a] border-2 border-[#0f0824] flex items-center justify-center text-[8px] font-bold text-white">B</div>
          <div className="w-6 h-6 rounded-full bg-[#627eea] border-2 border-[#0f0824] flex items-center justify-center text-[8px] font-bold text-white">E</div>
        </div>
      </div>

      <div className="relative space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5 ml-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300/60">Amount</label>
            <span className="text-[11px] font-semibold text-indigo-400">≈ ${usd} USD</span>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-indigo-400/70">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-[#07040f] border border-indigo-500/20 rounded-2xl py-4 pl-11 pr-16 text-2xl font-extrabold tracking-tight text-white outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all placeholder:text-slate-700"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-indigo-300/50 tracking-wider">INR</span>
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
                    ? 'bg-indigo-500/25 border-indigo-400/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]'
                    : 'bg-white/[0.03] border-white/5 text-indigo-200/80 hover:bg-indigo-500/15 hover:border-indigo-500/30 hover:text-white')
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
          className="relative w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/70"
        >
          <span aria-hidden className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)', backgroundSize: '200% 100%', animation: 'vault-shine 2.5s linear infinite' }} />
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin relative" /> <span className="relative">Opening OxaPay…</span></>)
            : polling ? (<><Loader2 className="w-4 h-4 animate-spin relative" /> <span className="relative">Verifying payment…</span></>)
            : (<><Bitcoin className="w-4 h-4 relative" /> <span className="relative">Pay ≈ ${usd} in Crypto</span></>)}
        </button>

        <div className="flex items-center justify-center gap-1.5 pt-1">
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[10px] text-slate-500 font-medium">Auto-credit after blockchain confirmation</p>
        </div>
      </div>
    </div>
  );
}
