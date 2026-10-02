import React, { useState } from 'react';
import { User } from '../../types';
import { Share2, Copy, CheckCircle2, Users, Award, Sparkles } from 'lucide-react';
import { taskStore } from '../../utils/taskStore';

interface ReferEarnPageProps {
  user: User;
}

export const ReferEarnPage: React.FC<ReferEarnPageProps> = ({ user }) => {
  const settings = taskStore.getSettings();
  const refBonus = settings.referral_reward || 50;

  const [copied, setCopied] = useState(false);

  const referralLink = `https://taskearnpro.com/register?ref=${user.referral_code}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🚀 Join Task Earn Pro & earn real cash daily by completing simple tasks! Use my referral code *${user.referral_code}* to get an instant bonus ₹${refBonus} on signup:\n${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Refer &amp; Earn
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Invite friends to Task Earn Pro and earn ₹{refBonus} for every successful referral.
        </p>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl space-y-4">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-violet-100">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Earn ₹{refBonus} Per Friend</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold">Share with friends &amp; earn lifetime bonus</h2>
        <p className="text-xs sm:text-sm text-violet-100">
          When your friend signs up using your code and completes their first task, you receive your reward instantly in your wallet!
        </p>
      </div>

      {/* Referral Code Box */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Your Unique Referral Code
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={user.referral_code}
              className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-2xl text-base font-black text-slate-900 tracking-wider font-mono text-center"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(user.referral_code || 'TEP2026');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs transition shadow-xs cursor-pointer shrink-0"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Referral Link
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-600 truncate font-mono"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition shrink-0 cursor-pointer flex items-center space-x-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied' : 'Link'}</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleShareWhatsApp}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs sm:text-sm transition shadow-md cursor-pointer flex items-center justify-center space-x-2"
        >
          <Share2 className="w-4 h-4" />
          <span>Share via WhatsApp</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1">
          <Users className="w-5 h-5 text-indigo-600 mx-auto" />
          <span className="text-xs text-slate-400 block font-semibold">Total Referrals</span>
          <span className="text-xl font-extrabold text-slate-900">3</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
          <span className="text-xs text-slate-400 block font-semibold">Successful</span>
          <span className="text-xl font-extrabold text-emerald-700">3</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center space-y-1">
          <Award className="w-5 h-5 text-violet-600 mx-auto" />
          <span className="text-xs text-slate-400 block font-semibold">Earnings</span>
          <span className="text-xl font-extrabold text-violet-700">₹150</span>
        </div>
      </div>
    </div>
  );
};
