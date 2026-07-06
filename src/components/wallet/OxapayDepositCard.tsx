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
    <div className="bg-[#161022] rounded-3xl border border-violet-500/10 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
          OxaPay Crypto
        </h3>
        <div className="flex gap-1.5">
          <div className="w-5 h-5 bg-[#26a17b]/20 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-[#26a17b] rounded-full" /></div>
          <div className="w-5 h-5 bg-[#f7931a]/20 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-[#f7931a] rounded-full" /></div>
          <div className="w-5 h-5 bg-[#627eea]/20 rounded-full flex items-center justify-center"><div className="w-2.5 h-2.5 bg-[#627eea] rounded-full" /></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter Amount"
            className="w-full bg-[#0b0712] border border-violet-500/20 rounded-2xl py-4 pl-5 pr-24 text-xl font-medium text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-end">
            <span className="text-slate-500 font-medium leading-none text-sm">INR</span>
            <span className="text-[10px] text-indigo-400 mt-1">≈ ${usd}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((q) => {
            const active = Number(amount) === q;
            return (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className={
                  'flex-1 py-2 rounded-xl text-xs transition-all border ' +
                  (active
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-100'
                    : 'bg-violet-500/5 border-violet-500/10 text-indigo-200 hover:bg-indigo-500/20 hover:border-indigo-500/30')
                }
              >
                ₹{q >= 1000 ? `${q / 1000}k` : q}
              </button>
            );
          })}
        </div>

        <div className="flex justify-center gap-4 py-1">
          {['USDT-TRC20', 'BTC', 'LTC', 'TRX', 'ETH'].map((c) => (
            <span key={c} className="text-[10px] font-medium text-slate-500">{c}</span>
          ))}
        </div>

        <button
          onClick={handlePay}
          disabled={loading || polling}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-900/40 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Opening OxaPay…</>)
            : polling ? (<><Loader2 className="h-4 w-4 animate-spin" /> Verifying payment…</>)
            : (<><Bitcoin className="h-4 w-4" /> Pay with Crypto</>)}
        </button>
      </div>
    </div>
  );
}
