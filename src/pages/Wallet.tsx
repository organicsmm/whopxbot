import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions, type TransactionFilter } from '@/hooks/useTransactions';
import { useCurrency } from '@/hooks/useCurrency';
import RazorpayDepositCard from '@/components/wallet/RazorpayDepositCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
  IndianRupee,
  Zap,
} from 'lucide-react';

export default function Wallet() {
  const { wallet } = useWallet();
  const { formatPrice, rates } = useCurrency();
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const { data: transactions } = useTransactions(filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="h-4 w-4" style={{ color: '#5e8a5c' }} />;
      case 'order': return <ArrowUpRight className="h-4 w-4" style={{ color: '#ef4444' }} />;
      case 'refund': return <RefreshCw className="h-4 w-4" style={{ color: '#4a6741' }} />;
      default: return <WalletIcon className="h-4 w-4" style={{ color: '#999' }} />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'deposit': return 'rgba(16,185,129,.1)';
      case 'order': return 'rgba(239,68,68,.1)';
      case 'refund': return 'rgba(22, 163, 74,.1)';
      default: return 'rgba(0,0,0,.04)';
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'deposit': return '#5e8a5c';
      case 'order': return '#ef4444';
      case 'refund': return '#4a6741';
      default: return '#2a2418';
    }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const displayTransactions = (() => {
    if (!transactions?.length) return [];

    const adjustments = new Map<string, number>();
    const inrRate = rates.INR || 83.5;

    for (const tx of transactions) {
      if (tx.payment_method !== 'razorpay_auto' || !tx.payment_reference) continue;

      const originalReference = tx.payment_reference.endsWith('_exact_credit_fix')
        ? tx.payment_reference.replace(/_exact_credit_fix$/, '')
        : tx.payment_reference.endsWith('_fee_adjust')
          ? tx.payment_reference.replace(/_fee_adjust$/, '')
          : null;

      if (!originalReference) continue;
      adjustments.set(originalReference, (adjustments.get(originalReference) || 0) + Number(tx.amount || 0));
    }

    return transactions
      .filter((tx) => !(tx.payment_method === 'razorpay_auto' && tx.payment_reference && (tx.payment_reference.endsWith('_exact_credit_fix') || tx.payment_reference.endsWith('_fee_adjust'))))
      .map((tx) => {
        const adjustment = tx.payment_method === 'razorpay_auto' && tx.payment_reference
          ? adjustments.get(tx.payment_reference) || 0
          : 0;

        const displayAmount = Number(tx.amount || 0) + adjustment;
        const displayBalanceAfter = tx.balance_after != null
          ? Number(tx.balance_after) + adjustment
          : null;

        const displayDescription = tx.payment_method === 'razorpay_auto' && adjustment !== 0
          ? `Wallet top-up via Razorpay (₹${(displayAmount * inrRate).toFixed(2)} exact credit)`
          : (tx.description || tx.type.charAt(0).toUpperCase() + tx.type.slice(1));

        return {
          ...tx,
          displayAmount,
          displayBalanceAfter,
          displayDescription,
        };
      });
  })();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#2a2418' }}>Wallet</h1>
          <p className="text-[13px] mt-1" style={{ color: '#999' }}>Manage your balance and transactions.</p>
        </div>

        {/* Balance Card — Credit-card inspired (orange brand) */}
        <div
          className="relative overflow-hidden rounded-[28px] p-6 md:p-8 text-white"
          style={{
            background:
              'linear-gradient(135deg, #c97a52 0%, #b56a3f 45%, #c2410c 100%)',
            boxShadow:
              '0 20px 40px -12px rgba(234,88,12,.45), inset 0 1px 0 rgba(255,255,255,.18)',
          }}
        >
          {/* faint grid texture */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage:
                'radial-gradient(ellipse at top left, black 30%, transparent 75%)',
              WebkitMaskImage:
                'radial-gradient(ellipse at top left, black 30%, transparent 75%)',
            }}
          />
          {/* glossy highlight */}
          <div
            aria-hidden
            className="absolute -top-24 -right-16 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'rgba(255,255,255,.18)', filter: 'blur(50px)' }}
          />

          {/* EMV chip */}
          <div
            aria-hidden
            className="absolute top-6 right-6 md:top-8 md:right-8 w-11 h-8 rounded-md"
            style={{
              background:
                'linear-gradient(135deg, #fde68a 0%, #f59e0b 60%, #b45309 100%)',
              boxShadow:
                'inset 0 0 0 1px rgba(255,255,255,.4), 0 2px 6px rgba(0,0,0,.2)',
            }}
          >
            <div className="grid grid-cols-3 gap-px h-full w-full p-1 opacity-60">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i} className="bg-amber-900/40 rounded-[1px]" />
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <WalletIcon className="h-3.5 w-3.5 text-white/90" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
                Available Balance
              </p>
            </div>

            <p className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-sm">
              {formatPrice(wallet?.balance || 0)}
            </p>

            <div className="flex items-end justify-between gap-4 mt-8">
              <div className="flex gap-2">
                <div
                  className="rounded-xl px-3 py-2 backdrop-blur-sm"
                  style={{
                    background: 'rgba(255,255,255,.14)',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.18)',
                  }}
                >
                  <p className="text-[9px] font-semibold tracking-widest text-white/70">IN</p>
                  <p className="text-sm font-bold leading-tight">
                    {formatPrice(wallet?.total_deposited || 0)}
                  </p>
                </div>
                <div
                  className="rounded-xl px-3 py-2 backdrop-blur-sm"
                  style={{
                    background: 'rgba(0,0,0,.12)',
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)',
                  }}
                >
                  <p className="text-[9px] font-semibold tracking-widest text-white/70">OUT</p>
                  <p className="text-sm font-bold leading-tight text-white/90">
                    {formatPrice(wallet?.total_spent || 0)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-semibold tracking-[0.2em] text-white/60">CURRENCY</p>
                <p className="text-base font-extrabold italic tracking-wide">INR</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deposit Section — UPI / Cards only (USDT removed for security) */}
        <RazorpayDepositCard />

        {/* Transaction History */}
        <div className="rounded-2xl p-6" style={{ background: 'white', border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="text-lg font-bold" style={{ color: '#2a2418' }}>Transaction History</h2>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(0,0,0,.03)' }}>
              {(['all', 'deposit', 'order', 'refund'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: filter === f ? '#4a6741' : 'transparent',
                    color: filter === f ? 'white' : '#888',
                  }}
                >
                  {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : f === 'order' ? 'Orders' : 'Refunds'}
                </button>
              ))}
            </div>
          </div>

          {displayTransactions.length > 0 ? (
            <div className="space-y-2">
              {displayTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-colors"
                  style={{ background: 'rgba(0,0,0,.015)', border: '1px solid rgba(0,0,0,.04)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: getIconBg(tx.type) }}>
                      {getIcon(tx.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[13px] leading-tight truncate max-w-[260px]" style={{ color: '#2a2418' }}>
                        {tx.displayDescription}
                      </p>
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                        {tx.payment_method && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,.04)', color: '#888' }}>
                            {tx.payment_method.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        )}
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            background: tx.status === 'pending' ? 'rgba(245,158,11,.1)' : tx.status === 'completed' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
                            color: tx.status === 'pending' ? '#f59e0b' : tx.status === 'completed' ? '#5e8a5c' : '#ef4444',
                          }}
                        >
                          {tx.status}
                        </span>
                        <span className="text-[11px]" style={{ color: '#bbb' }}>{fmtDate(tx.created_at!)}</span>
                        {tx.payment_reference && tx.payment_method === 'usdt_bep20' && (
                          <a
                            href={`https://bscscan.com/tx/${tx.payment_reference}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] flex items-center gap-0.5 hover:underline"
                            style={{ color: '#4a6741' }}
                          >
                            BSCScan <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-[15px]" style={{ color: getAmountColor(tx.type) }}>
                      {tx.type === 'order' ? '−' : '+'}{formatPrice(Math.abs(Number(tx.displayAmount)))}
                    </p>
                    {tx.displayBalanceAfter != null && (
                      <p className="text-[11px] mt-0.5" style={{ color: '#bbb' }}>
                        Bal: {formatPrice(Number(tx.displayBalanceAfter))}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(22, 163, 74,.08)' }}>
                <WalletIcon className="h-6 w-6" style={{ color: '#4a6741' }} />
              </div>
              <p className="font-medium text-[14px]" style={{ color: '#666' }}>No transactions yet</p>
              <p className="text-[12px] mt-1" style={{ color: '#bbb' }}>Your deposits and spending history will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
