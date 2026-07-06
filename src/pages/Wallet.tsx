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
  CreditCard,
} from 'lucide-react';

export default function Wallet() {
  const { wallet } = useWallet();
  const { formatPrice, rates } = useCurrency();
  const [filter, setFilter] = useState<TransactionFilter>('all');
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
      <div className="min-h-full bg-[#0b0712] -mx-4 -my-6 md:-mx-6 md:-my-8 px-4 py-6 md:px-8 md:py-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Wallet</h1>
            <p className="text-[13px] mt-1 text-violet-300/60">Manage your balance and transactions.</p>
          </div>

          {/* Balance Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2e1065] to-[#1e1b4b] p-6 border border-violet-500/20 shadow-2xl">
            <div aria-hidden className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 bg-violet-500/25 blur-[100px] rounded-full" />
            <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 w-64 h-64 bg-fuchsia-500/15 blur-[100px] rounded-full" />

            <div className="relative flex justify-between items-start">
              <div>
                <p className="text-violet-300 text-sm font-medium mb-1">Available Balance</p>
                <h1 className="text-4xl font-bold tracking-tight text-white">{formatPrice(wallet?.balance || 0)}</h1>
                <p className="text-violet-400/60 text-xs mt-1">Currency · USD</p>
              </div>
              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/10">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="relative grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-violet-300/60">Inflow</p>
                  <p className="text-sm font-semibold text-emerald-400">{formatPrice(wallet?.total_deposited || 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-violet-300/60">Outflow</p>
                  <p className="text-sm font-semibold text-rose-400">{formatPrice(wallet?.total_spent || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit cards */}
          <ZapUpiDepositCard />
          <OxapayDepositCard />

          {/* Transaction History */}
          <div className="bg-[#161022] rounded-3xl border border-violet-500/10 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-white">Transaction History</h3>
            </div>

            <div className="flex gap-1 p-1 bg-[#0b0712] rounded-xl mb-6">
              {(['all', 'deposit', 'order', 'refund'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={
                    'flex-1 py-2 rounded-lg text-xs font-medium transition-all ' +
                    (filter === f
                      ? 'bg-violet-500/15 text-violet-300'
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
                    className="flex items-center justify-between p-4 rounded-2xl bg-[#0b0712] border border-violet-500/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={'w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ' + getIconBg(tx.type)}>
                        {getIcon(tx.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[13px] leading-tight truncate max-w-[260px] text-slate-100">
                          {tx.displayDescription}
                        </p>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                          {tx.payment_method && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/5 text-violet-300/70">
                              {tx.payment_method.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          )}
                          <span
                            className={
                              'text-[9px] font-semibold px-1.5 py-0.5 rounded ' +
                              (tx.status === 'pending'
                                ? 'bg-amber-500/15 text-amber-300'
                                : tx.status === 'completed'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-rose-500/15 text-rose-300')
                            }
                          >
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
                        <p className="text-[11px] mt-0.5 text-slate-500">
                          Bal: {formatPrice(Number(tx.displayBalanceAfter))}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/5 flex items-center justify-center text-violet-500/30 mb-4">
                  <WalletIcon className="w-8 h-8" />
                </div>
                <p className="text-slate-400 text-sm">No transactions found yet</p>
                <p className="text-slate-600 text-xs mt-1">Your recent activities will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
