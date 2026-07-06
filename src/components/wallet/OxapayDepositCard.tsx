import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bitcoin, ShieldCheck, Loader2 } from 'lucide-react';
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
    next.delete('deposit');
    next.delete('order_id');
    setSearchParams(next, { replace: true });
  }

  async function pollUntilCredited(orderId: string) {
    setPolling(true);
    const start = Date.now();
    const MAX_MS = 120_000;
    const INTERVAL = 4_000;
    toast.loading('Verifying crypto payment…', { id: `ox-${orderId}` });

    while (Date.now() - start < MAX_MS) {
      try {
        const { data } = await supabase.functions.invoke('oxapay-sync-deposit', {
          body: { order_id: orderId },
        });
        if (data?.credited || data?.status === 'success') {
          toast.success('🎉 Wallet credited!', { id: `ox-${orderId}` });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          clearParams();
          setPolling(false);
          return;
        }
        if (data?.status === 'failed') {
          toast.error('Payment expired.', { id: `ox-${orderId}` });
          clearParams();
          setPolling(false);
          return;
        }
      } catch (e) {
        console.error('sync error', e);
      }
      await new Promise((r) => setTimeout(r, INTERVAL));
    }
    toast.dismiss(`ox-${orderId}`);
    toast.message('Still waiting for blockchain confirmation. It will credit automatically.');
    clearParams();
    setPolling(false);
  }

  async function handlePay() {
    const inr = Math.floor(Number(amount) || 0);
    if (!inr || inr < MIN_AMOUNT) return toast.error(`Minimum is ₹${MIN_AMOUNT}`);
    if (inr > MAX_AMOUNT) return toast.error(`Maximum is ₹${MAX_AMOUNT}`);

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('oxapay-create-wallet-topup', {
        body: { amount_inr: inr },
      });
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
    <div className="rounded-2xl overflow-hidden relative border border-white/10 bg-[#0a0a14]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] mt-6">
      <div className="h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-500" />
      <div className="p-6 relative">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 bg-orange-500/15 blur-[100px] rounded-full" />

        <div className="relative flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 shadow-[0_0_20px_rgba(251,146,60,0.35)]">
            <Bitcoin className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold !text-white tracking-tight">Add Funds — Crypto (USDT/BTC)</h2>
            <p className="text-[12px] text-white/80">Pay with USDT, BTC, LTC, TRX · auto credit on confirmation</p>
          </div>
        </div>

        <div className="relative mt-5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
            Amount (INR)
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 focus-within:border-orange-400/40 transition-colors">
            <span className="text-lg font-bold text-white/70">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent outline-none text-lg font-bold !text-white placeholder:text-white/65"
              placeholder="1000"
            />
            <span className="text-[11px] text-white/60">
              ≈ ${(Number(amount || 0) / 83.5).toFixed(2)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((q) => {
              const active = Number(amount) === q;
              return (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className={
                    'py-2 rounded-lg text-[13px] font-semibold transition-all border ' +
                    (active
                      ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white border-orange-400/50 shadow-[0_0_18px_rgba(251,146,60,0.35)]'
                      : 'bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.06] hover:text-white')
                  }
                >
                  ₹{q}
                </button>
              );
            })}
          </div>

          <button
            onClick={handlePay}
            disabled={loading || polling}
            className="mt-5 w-full py-3 rounded-xl font-bold !text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 shadow-[0_10px_30px_rgba(251,146,60,0.35)] hover:shadow-[0_12px_36px_rgba(251,146,60,0.5)]"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Opening OxaPay…</>
            ) : polling ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Verifying payment…</>
            ) : (
              <><Bitcoin className="h-4 w-4" /> Pay with Crypto</>
            )}
          </button>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/80">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            USDT-TRC20 · BTC · LTC · TRX · ETH — auto wallet credit
          </div>
        </div>
      </div>
    </div>
  );
}
