import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wallet as WalletIcon, Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const QUICK_AMOUNTS = [50, 100, 500, 1000];
const MIN_AMOUNT = 50;
const MAX_AMOUNT = 100000;

export default function ZapUpiDepositCard() {
  const [amount, setAmount] = useState<string>('100');
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const polledRef = useRef<string | null>(null);

  // Handle return from payment page
  useEffect(() => {
    const deposit = searchParams.get('deposit');
    const orderId = searchParams.get('order_id');
    if (!deposit || !orderId) return;
    if (polledRef.current === orderId) return;
    polledRef.current = orderId;

    if (deposit === 'failed') {
      toast.error('Payment failed. Please try again.');
      clearParams();
      return;
    }
    if (deposit === 'timeout') {
      toast.error('Payment timed out. If amount was deducted, it will reflect shortly.');
      clearParams();
      // still try polling in case it actually succeeded
      pollUntilCredited(orderId);
      return;
    }
    if (deposit === 'success') {
      pollUntilCredited(orderId);
    }
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
    const MAX_MS = 60_000;
    const INTERVAL = 3_000;
    let attempt = 0;

    toast.loading('Verifying payment…', { id: `zap-${orderId}` });

    while (Date.now() - start < MAX_MS) {
      attempt += 1;
      try {
        const { data, error } = await supabase.functions.invoke('zapupi-sync-deposit', {
          body: { order_id: orderId },
        });
        if (error) throw error;

        if (data?.status === 'success' || data?.credited) {
          toast.success('🎉 Wallet credited successfully!', { id: `zap-${orderId}` });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          clearParams();
          setPolling(false);
          return;
        }
        if (data?.status === 'failed') {
          toast.error('Payment failed.', { id: `zap-${orderId}` });
          clearParams();
          setPolling(false);
          return;
        }
      } catch (e) {
        console.error('sync error', e);
      }
      await new Promise((r) => setTimeout(r, INTERVAL));
    }

    toast.error(
      'Could not confirm payment in time. If amount was deducted, it will be credited automatically.',
      { id: `zap-${orderId}` }
    );
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    clearParams();
    setPolling(false);
  }

  async function handlePay() {
    const inr = Math.floor(Number(amount) || 0);
    if (!inr || inr < MIN_AMOUNT) {
      toast.error(`Minimum deposit is ₹${MIN_AMOUNT}`);
      return;
    }
    if (inr > MAX_AMOUNT) {
      toast.error(`Maximum deposit is ₹${MAX_AMOUNT}`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zapupi-create-order', {
        body: { amount_inr: inr },
      });
      if (error) throw error;
      if (!data?.payment_url) throw new Error(data?.error || 'No payment URL');
      // Redirect to UPI page
      window.location.href = data.payment_url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Could not start payment');
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden relative border border-white/10 bg-[#0a0a14]/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-emerald-400" />

      <div className="p-6 relative">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 bg-purple-500/15 blur-[100px] rounded-full" />

        <div className="relative flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-[0_0_20px_rgba(168,85,247,0.35)]">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold !text-white tracking-tight">Add Funds — Instant UPI</h2>
            <p className="text-[12px] text-white/50">Pay with any UPI app · auto credit in seconds</p>
          </div>
        </div>

        <div className="relative mt-5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Amount (INR)
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 focus-within:border-purple-400/40 focus-within:bg-white/[0.05] transition-colors">
            <span className="text-lg font-bold text-white/70">₹</span>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent outline-none text-lg font-bold !text-white placeholder:text-white/30"
              placeholder="100"
            />
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
                      ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white border-purple-400/50 shadow-[0_0_18px_rgba(168,85,247,0.35)]'
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
            className="mt-5 w-full py-3 rounded-xl font-bold !text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 shadow-[0_10px_30px_rgba(168,85,247,0.35)] hover:shadow-[0_12px_36px_rgba(168,85,247,0.5)]"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Opening UPI…</>
            ) : polling ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Verifying payment…</>
            ) : (
              <><Zap className="h-4 w-4" /> Pay with UPI</>
            )}
          </button>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-white/50">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            Secure UPI payment · auto wallet credit · no manual approval
          </div>
        </div>
      </div>
    </div>
  );
}

