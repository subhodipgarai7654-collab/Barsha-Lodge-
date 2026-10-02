import React, { useState } from 'react';
import { Wallet, Transaction } from '../../types';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Clock, Award, Shield, PlusCircle } from 'lucide-react';

interface WalletPageProps {
  wallet: Wallet;
  transactions: Transaction[];
  onNavigateToWithdraw: () => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  wallet,
  transactions,
  onNavigateToWithdraw
}) => {
  const [filterType, setFilterType] = useState<string>('All');

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'All') return true;
    return tx.type.toLowerCase() === filterType.toLowerCase();
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Wallet &amp; Earnings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your balance and track all reward transactions.
        </p>
      </div>

      {/* Wallet Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <WalletIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Available Balance</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
                ₹{wallet.available_balance.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={onNavigateToWithdraw}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition shadow-md cursor-pointer active:scale-95"
          >
            Withdraw Cash
          </button>
        </div>

        {/* 3 Stats Grid */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Pending Balance</span>
            <span className="text-base font-bold text-amber-400">₹{wallet.pending_balance}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Total Earned</span>
            <span className="text-base font-bold text-indigo-300">₹{wallet.total_earned}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Total Withdrawn</span>
            <span className="text-base font-bold text-slate-200">₹{wallet.total_withdrawn}</span>
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-base text-slate-900">Transaction History</h2>
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {['All', 'Task Reward', 'Referral Reward', 'Withdrawal'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                  filterType === type
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              No transactions found for this filter.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isPositive ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">{tx.type}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{tx.description}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {new Date(tx.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`text-sm sm:text-base font-extrabold shrink-0 ${
                      isPositive ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {isPositive ? `+₹${tx.amount}` : `-₹{Math.abs(tx.amount)}`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
