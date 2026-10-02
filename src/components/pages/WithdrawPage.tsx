import React, { useState } from 'react';
import { Wallet, WithdrawalRequest } from '../../types';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { taskStore } from '../../utils/taskStore';

interface WithdrawPageProps {
  wallet: Wallet;
  withdrawals: WithdrawalRequest[];
  onWithdrawalRequested: (req: WithdrawalRequest) => void;
}

export const WithdrawPage: React.FC<WithdrawPageProps> = ({
  wallet,
  withdrawals,
  onWithdrawalRequested
}) => {
  const settings = taskStore.getSettings();
  const minWith = settings.min_withdrawal || 250;

  const [amount, setAmount] = useState<number>(Math.max(minWith, wallet.available_balance));
  const [method, setMethod] = useState<'UPI' | 'Bank Transfer'>('UPI');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (amount < minWith) {
      setErrorMsg(`Minimum withdrawal amount is ₹${minWith}`);
      return;
    }

    if (amount > wallet.available_balance) {
      setErrorMsg('Withdrawal amount cannot exceed available balance');
      return;
    }

    if (!paymentDetails.trim()) {
      setErrorMsg(method === 'UPI' ? 'Please enter a valid UPI ID (e.g. 9876543210@paytm)' : 'Please enter Bank Account & IFSC');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newReq: WithdrawalRequest = {
        id: Date.now(),
        user_id: 1,
        user_name: 'Alex Johnson',
        amount,
        payment_method: method,
        payment_details: paymentDetails.trim(),
        status: 'Pending',
        created_at: new Date().toISOString()
      };

      taskStore.addWithdrawal(newReq);
      onWithdrawalRequested(newReq);

      // Deduct available balance and add to wallet
      const updatedWallet = {
        ...wallet,
        available_balance: wallet.available_balance - amount,
        total_withdrawn: wallet.total_withdrawn + amount
      };
      taskStore.saveWallet(updatedWallet);

      setIsSubmitting(false);
      setSuccessMsg('Withdrawal request submitted successfully! Pending admin processing.');
      setPaymentDetails('');
    }, 600);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Withdraw Earnings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Transfer your reward balance directly to your UPI ID or Bank Account.
        </p>
      </div>

      {/* Available Balance Box */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400 block font-semibold">Available for Withdrawal</span>
          <span className="text-2xl font-extrabold text-emerald-700">₹{wallet.available_balance}</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block font-semibold">Minimum Limit</span>
          <span className="text-sm font-bold text-slate-700">₹{minWith}</span>
        </div>
      </div>

      {/* Withdrawal Form */}
      <form onSubmit={handleRequestWithdrawal} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 border-b border-slate-100 pb-2">
          Request Payout
        </h3>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Withdrawal Amount (₹) *</label>
          <input
            type="number"
            required
            min={minWith}
            max={wallet.available_balance}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method *</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('UPI')}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                method === 'UPI'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              UPI ID
            </button>
            <button
              type="button"
              onClick={() => setMethod('Bank Transfer')}
              className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                method === 'Bank Transfer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Bank Transfer
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {method === 'UPI' ? 'UPI ID (e.g. 9876543210@paytm) *' : 'Bank Account & IFSC *'}
          </label>
          <input
            type="text"
            required
            placeholder={method === 'UPI' ? 'Enter UPI ID' : 'Acc No & IFSC Code'}
            value={paymentDetails}
            onChange={(e) => setPaymentDetails(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:border-indigo-500 focus:outline-none font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || wallet.available_balance < minWith}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Submitting Request...' : 'Submit Withdrawal Request'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Withdrawal Requests History */}
      <div className="space-y-3 pt-2">
        <h2 className="font-extrabold text-base text-slate-900">Your Withdrawal History</h2>
        <div className="space-y-2.5">
          {withdrawals.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              No withdrawal requests yet.
            </div>
          ) : (
            withdrawals.map((w) => (
              <div
                key={w.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-900">₹{w.amount}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : w.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {w.payment_method}: {w.payment_details}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {new Date(w.created_at).toLocaleString()}
                  </span>
                </div>

                {w.transaction_ref && (
                  <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">
                    Ref: {w.transaction_ref}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
