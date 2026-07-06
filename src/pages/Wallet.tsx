import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useWallet } from '@/hooks/useWallet';
import { useTransactions, type TransactionFilter } from '@/hooks/useTransactions';
import { useCurrency } from '@/hooks/useCurrency';

import OxapayDepositCard from '@/components/wallet/OxapayDepositCard';
import ZapUpiDepositCard from '@/components/wallet/ZapUpiDepositCard';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
  Zap,
  Bitcoin,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function Wallet() {
  const { wallet } = useWallet();
  const { formatPrice, rates } = useCurrency();
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [method, setMethod] = useState<'upi' | 'crypto'>('upi');
  const { data: transactions } = useTransactions(filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowDownLeft className="h-4 w-4 text-emerald-400" />;
      case 'order': return <ArrowUpRight className="h-4 w-4 text-rose-400" />;
      case 'refund': return <RefreshCw className="h-4 w-4 text-violet-300" />;
      default: return <WalletIcon className="h-4 w-4 text-slate-400" />;
    }
  };
  const getIconBg = (type: string) => {
    switch (type) {
      case 'deposit': return 'bg-emerald-500/15';
      case 'order': return 'bg-rose-500/15';
      case 'refund': return 'bg-violet-500/15';
      default: return 'bg-white/5';
    }
  };
  const getAmountColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-emerald-400';
      case 'order': return 'text-rose-400';
      case 'refund': return 'text-violet-300';
      default: return 'text-slate-200';
    }
  };
  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const displayTransactions = (() => {
    if (!transactions?.length) return [];
    const adjustments = new Map<string, number>();
    const inrRate = rates.INR || 83.5;
    for (const tx of transactions) {
      if (tx.payment_method !== 'razorpay_auto' || !tx.payment_reference) continue;
      const originalReference = tx.payment_reference.endsWith('_exact_credit_fix')
        ? tx.payment_reference.replace(/_exact_credit_fix$/, '')
        : tx.payment_reference.endsWith('_fee_adjust')
          ? tx.payment_reference.replace(/_fee_adjust$/, '') : null;
      if (!originalReference) continue;
      adjustments.set(originalReference, (adjustments.get(originalReference) || 0) + Number(tx.amount || 0));
    }
    return transactions
      .filter((tx) => !(tx.payment_method === 'razorpay_auto' && tx.payment_reference && (tx.payment_reference.endsWith('_exact_credit_fix') || tx.payment_reference.endsWith('_fee_adjust'))))
      .map((tx) => {
        const adjustment = tx.payment_method === 'razorpay_auto' && tx.payment_reference ? adjustments.get(tx.payment_reference) || 0 : 0;
        const displayAmount = Number(tx.amount || 0) + adjustment;
        const displayBalanceAfter = tx.balance_after != null ? Number(tx.balance_after) + adjustment : null;
        const displayDescription = tx.payment_method === 'razorpay_auto' && adjustment !== 0
          ? `Wallet top-up via Razorpay (₹${(displayAmount * inrRate).toFixed(2)} exact credit)`
          : (tx.description || tx.type.charAt(0).toUpperCase() + tx.type.slice(1));
        return { ...tx, displayAmount, displayBalanceAfter, displayDescription };
      });
  })();

  return (
    <DashboardLayout>
      <style>{`
        @keyframes vault-aurora { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,-10px) scale(1.08)} }
        @keyframes vault-shine { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes vault-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
      <div className="min-h-full bg-[#07040f] -mx-4 -my-6 md:-mx-6 md:-my-8 px-4 py-6 md:px-8 md:py-10 relative overflow-hidden">
        {/* Ambient page glow */}
        <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-700/10 blur-[140px] rounded-full" />
        <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 w-[500px] h-[500px] bg-fuchsia-600/10 blur-[130px] rounded-full" />

        <div className="max-w-2xl mx-auto space-y-6 relative">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]" style={{ animation: 'vault-pulse 2s ease-in-out infinite' }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-violet-300/70">Vault</p>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Wallet</h1>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-300">Secure</span>
            </div>
          </div>

          {/* Premium Balance Card */}
          <div className="relative overflow-hidden rounded-[28px] p-[1px] shadow-2xl shadow-violet-950/50"
            style={{ background: 'linear-gradient(135deg, rgba(167,139,250,.5), rgba(139,92,246,.15) 40%, rgba(217,70,239,.35) 100%)' }}>
            <div className="relative rounded-[27px] bg-gradient-to-br from-[#1a0b3e] via-[#160829] to-[#0f0620] p-7 overflow-hidden">
              {/* Animated aurora blobs */}
              <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 bg-violet-500/30 blur-[110px] rounded-full" style={{ animation: 'vault-aurora 8s ease-in-out infinite' }} />
              <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 w-72 h-72 bg-fuchsia-500/20 blur-[110px] rounded-full" style={{ animation: 'vault-aurora 10s ease-in-out infinite reverse' }} />
              {/* Grid texture */}
              <div aria-hidden className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

              <div className="relative flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <WalletIcon className="w-3 h-3 text-violet-300/80" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-200/80">Available Balance</p>
                  </div>
                  <h2 className="text-[46px] leading-none font-extrabold tracking-tight text-white" style={{
                    background: 'linear-gradient(180deg, #ffffff 0%, #e9d5ff 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>{formatPrice(wallet?.balance || 0)}</h2>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Sparkles className="w-3 h-3 text-violet-300/70" />
                    <p className="text-[11px] text-violet-300/70 font-medium">Live · USD wallet</p>
                  </div>
                </div>
                {/* EMV chip */}
                <div className="relative w-12 h-9 rounded-md overflow-hidden" style={{
                  background: 'linear-gradient(135deg, #fde68a 0%, #d97706 50%, #78350f 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.35), 0 4px 10px rgba(0,0,0,.4)',
                }}>
                  <div className="grid grid-cols-3 gap-px h-full w-full p-1 opacity-70">
                    {Array.from({ length: 6 }).map((_, i) => (<span key={i} className="bg-amber-900/50 rounded-[1px]" />))}
                  </div>
                </div>
              </div>

              {/* Dotted separator */}
              <div className="relative my-6 h-px border-t border-dashed border-violet-300/20" />

              <div className="relative grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/5 px-3 py-2.5 backdrop-blur">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">Inflow</p>
                    <p className="text-sm font-bold text-white truncate">{formatPrice(wallet?.total_deposited || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/5 px-3 py-2.5 backdrop-blur">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-rose-300/70">Outflow</p>
                    <p className="text-sm font-bold text-white truncate">{formatPrice(wallet?.total_spent || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit section — tabbed */}
          <div className="relative">
            <div className="flex items-end justify-between mb-3 px-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300/70">Add Funds</p>
                <h3 className="text-lg font-bold text-white mt-0.5">Choose payment method</h3>
              </div>
            </div>

            {/* Method switcher */}
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#0f0824] border border-violet-500/10 mb-4">
              <button
                onClick={() => setMethod('upi')}
                className={
                  'relative flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ' +
                  (method === 'upi'
                    ? 'bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-lg shadow-violet-900/50'
                    : 'text-violet-300/60 hover:text-violet-200 hover:bg-white/5')
                }
              >
                <Zap className={'w-4 h-4 ' + (method === 'upi' ? 'fill-white' : '')} />
                UPI · INR
                {method === 'upi' && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[8px] font-bold text-white leading-none tracking-wide">
                    INSTANT
                  </span>
                )}
              </button>
              <button
                onClick={() => setMethod('crypto')}
                className={
                  'flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ' +
                  (method === 'crypto'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-900/50'
                    : 'text-indigo-300/60 hover:text-indigo-200 hover:bg-white/5')
                }
              >
                <Bitcoin className="w-4 h-4" />
                Crypto · USD
              </button>
            </div>

            {method === 'upi' ? <ZapUpiDepositCard /> : <OxapayDepositCard />}
          </div>

          {/* Transaction History */}
          <div className="relative rounded-3xl bg-[#0f0824] border border-violet-500/10 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300/70">Activity</p>
                <h3 className="text-lg font-bold text-white mt-0.5">Transaction History</h3>
              </div>
              <span className="text-[11px] text-slate-500">{displayTransactions.length} total</span>
            </div>

            <div className="flex gap-1 p-1 bg-[#07040f] rounded-xl mb-5 border border-white/5">
              {(['all', 'deposit', 'order', 'refund'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={
                    'flex-1 py-2 rounded-lg text-xs font-semibold transition-all ' +
                    (filter === f
                      ? 'bg-violet-500/20 text-violet-200 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]'
                      : 'text-slate-500 hover:text-slate-300')
                  }
                >
                  {f === 'all' ? 'All' : f === 'deposit' ? 'Deposits' : f === 'order' ? 'Orders' : 'Refunds'}
                </button>
              ))}
            </div>

            {displayTransactions.length > 0 ? (
              <div className="space-y-2">
                {displayTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-[#07040f] border border-white/5 hover:border-violet-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={'w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ' + getIconBg(tx.type)}>
                        {getIcon(tx.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[13px] leading-tight truncate max-w-[240px] text-slate-100">
                          {tx.displayDescription}
                        </p>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                          {tx.payment_method && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-violet-300/70">
                              {tx.payment_method.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          )}
                          <span className={'text-[9px] font-semibold px-1.5 py-0.5 rounded ' + (tx.status === 'pending' ? 'bg-amber-500/15 text-amber-300' : tx.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300')}>
                            {tx.status}
                          </span>
                          <span className="text-[11px] text-slate-500">{fmtDate(tx.created_at!)}</span>
                          {tx.payment_reference && tx.payment_method === 'usdt_bep20' && (
                            <a href={`https://bscscan.com/tx/${tx.payment_reference}`} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-0.5 hover:underline text-violet-300">
                              BSCScan <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={'font-bold text-[15px] ' + getAmountColor(tx.type)}>
                        {tx.type === 'order' ? '−' : '+'}{formatPrice(Math.abs(Number(tx.displayAmount)))}
                      </p>
                      {tx.displayBalanceAfter != null && (
                        <p className="text-[11px] mt-0.5 text-slate-500">Bal: {formatPrice(Number(tx.displayBalanceAfter))}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="relative w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4 border border-violet-500/20">
                  <WalletIcon className="w-7 h-7 text-violet-400/60" />
                  <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-xl -z-10" />
                </div>
                <p className="text-slate-300 text-sm font-medium">No transactions yet</p>
                <p className="text-slate-500 text-xs mt-1">Your deposits and spending will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
