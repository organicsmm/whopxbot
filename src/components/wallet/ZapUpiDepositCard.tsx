import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Zap, ShieldCheck, Loader2, IndianRupee, Sparkles, CheckCircle2 } from 'lucide-react';
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

    toast.loading('Verifying payment…', { id: `zap-${orderId}` });

    while (Date.now() - start < MAX_MS) {
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

    toast.error('Could not confirm payment in time. If deducted, it will be credited automatically.', {
      id: `zap-${orderId}`,
    });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    clearParams();
    setPolling(false);
  }

  async function handlePay() {
    const inr = Math.floor(Number(amount) || 0);
    if (!inr || inr < MIN_AMOUNT) return toast.error(`Minimum deposit is ₹${MIN_AMOUNT}`);
    if (inr > MAX_AMOUNT) return toast.error(`Maximum deposit is ₹${MAX_AMOUNT}`);

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zapupi-create-order', {
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

  const inrNum = Math.floor(Number(amount) || 0);

  return (
    <div className="relative">
      {/* Boarding-pass style ticket */}
      <div
        className="relative rounded-[24px] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fed7aa 100%)',
          boxShadow:
            '0 20px 40px -12px rgba(234,88,12,.25), 0 0 0 1px rgba(234,88,12,.15), inset 0 1px 0 rgba(255,255,255,.9)',
        }}
      >
        {/* animated shimmer stripe */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            background:
              'linear-gradient(90deg, transparent, #ea580c, #fbbf24, #ea580c, transparent)',
            backgroundSize: '200% 100%',
            animation: 'zap-shimmer 3s linear infinite',
          }}
        />
        <style>{`@keyframes zap-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes zap-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:.9} }`}</style>

        {/* dotted world-map style texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #7c2d12 1px, transparent 0)',
            backgroundSize: '14px 14px',
          }}
        />

        {/* HEADER — like ticket stub */}
        <div className="relative flex items-stretch">
          <div
            className="flex flex-col items-center justify-center px-5 py-5"
            style={{
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              boxShadow: 'inset -1px 0 0 rgba(255,255,255,.15)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
              style={{
                boxShadow: '0 4px 12px rgba(0,0,0,.15), inset 0 0 0 3px rgba(234,88,12,.15)',
                animation: 'zap-pulse 2.5s ease-in-out infinite',
              }}
            >
              <Zap className="h-6 w-6" style={{ color: '#ea580c', fill: '#ea580c' }} />
            </div>
            <p className="text-[9px] font-bold tracking-[0.2em] text-white/90 mt-2">UPI</p>
          </div>

          <div className="flex-1 px-5 py-4 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="h-3 w-3" style={{ color: '#c2410c' }} />
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: '#c2410c' }}>
                Instant Deposit · India
              </p>
            </div>
            <h2 className="text-[19px] font-extrabold leading-tight" style={{ color: '#7c2d12' }}>
              Pay with any UPI app
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: '#9a3412' }}>
              GPay · PhonePe · Paytm · BHIM — auto credit in seconds
            </p>
          </div>
        </div>

        {/* PERFORATED SEPARATOR */}
        <div className="relative h-4">
          <div
            aria-hidden
            className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
            style={{ background: '#fef3e7', boxShadow: 'inset 0 0 0 1px rgba(234,88,12,.15)' }}
          />
          <div
            aria-hidden
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
            style={{ background: '#fef3e7', boxShadow: 'inset 0 0 0 1px rgba(234,88,12,.15)' }}
          />
          <div
            aria-hidden
            className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-t-2 border-dashed"
            style={{ borderColor: 'rgba(234,88,12,.35)' }}
          />
        </div>

        {/* BODY */}
        <div className="relative px-5 pb-5 pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#9a3412' }}>
              Enter Amount
            </label>
            <span className="text-[10px] font-semibold" style={{ color: '#c2410c' }}>
              ₹{MIN_AMOUNT} – ₹{MAX_AMOUNT.toLocaleString('en-IN')}
            </span>
          </div>

          <div
            className="flex items-center gap-2 rounded-2xl px-4 py-3 mb-3 bg-white"
            style={{
              boxShadow: 'inset 0 0 0 2px rgba(234,88,12,.25), 0 2px 8px rgba(234,88,12,.08)',
            }}
          >
            <IndianRupee className="h-5 w-5" style={{ color: '#ea580c' }} strokeWidth={2.5} />
            <input
              type="number"
              inputMode="numeric"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-transparent outline-none text-2xl font-extrabold tracking-tight"
              style={{ color: '#7c2d12' }}
              placeholder="0"
            />
            {inrNum >= MIN_AMOUNT && (
              <CheckCircle2 className="h-5 w-5" style={{ color: '#16a34a' }} />
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {QUICK_AMOUNTS.map((q) => {
              const active = Number(amount) === q;
              return (
                <button
                  key={q}
                  onClick={() => setAmount(String(q))}
                  className="py-2 rounded-xl text-[12px] font-bold transition-all"
                  style={
                    active
                      ? {
                          background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                          color: 'white',
                          boxShadow: '0 4px 12px rgba(234,88,12,.35)',
                        }
                      : {
                          background: 'white',
                          color: '#9a3412',
                          boxShadow: 'inset 0 0 0 1px rgba(234,88,12,.2)',
                        }
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
            className="relative w-full py-3.5 rounded-2xl font-extrabold text-white flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
              boxShadow:
                '0 10px 24px rgba(234,88,12,.4), inset 0 1px 0 rgba(255,255,255,.35)',
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 opacity-40"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,.5) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'zap-shimmer 2.5s linear infinite',
              }}
            />
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin relative" /> <span className="relative">Opening UPI…</span></>
            ) : polling ? (
              <><Loader2 className="h-4 w-4 animate-spin relative" /> <span className="relative">Verifying…</span></>
            ) : (
              <>
                <Zap className="h-4 w-4 relative" fill="white" />
                <span className="relative tracking-wide">
                  Pay ₹{inrNum || 0} via UPI
                </span>
              </>
            )}
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" style={{ color: '#16a34a' }} />
            <span className="text-[10px] font-semibold" style={{ color: '#4d7c0f' }}>
              100% Secure · Auto Wallet Credit · No Manual Approval
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
