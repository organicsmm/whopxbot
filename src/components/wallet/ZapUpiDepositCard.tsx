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
    <div className="bg-[#161022] rounded-3xl border border-violet-500/10 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
          ZapUPI Deposit
        </h3>
        <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[10px] font-bold uppercase tracking-tight">INR · Instant</span>
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
            className="w-full bg-[#0b0712] border border-violet-500/20 rounded-2xl py-4 pl-5 pr-16 text-xl font-medium text-white outline-none focus:border-violet-500 transition-all placeholder:text-slate-600"
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-medium">INR</span>
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
                    ? 'bg-violet-500/20 border-violet-500/40 text-violet-100'
                    : 'bg-violet-500/5 border-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:border-violet-500/30')
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
          className="w-full bg-violet-600 hover:bg-violet-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-violet-900/40 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Opening UPI…</>)
            : polling ? (<><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>)
            : (<><Zap className="h-4 w-4" fill="white" /> Pay via UPI</>)}
        </button>

        <p className="text-[10px] text-center text-slate-500">
          GPay · PhonePe · Paytm · BHIM — auto wallet credit
        </p>
      </div>
    </div>
  );
}
