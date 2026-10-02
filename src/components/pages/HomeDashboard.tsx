import React from 'react';
import { User, Wallet, Task, TaskSubmission } from '../../types';
import {
  Wallet as WalletIcon,
  Award,
  CheckCircle2,
  Clock,
  Share2,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Shield
} from 'lucide-react';

interface HomeDashboardProps {
  user: User;
  wallet: Wallet;
  tasks: Task[];
  submissions: TaskSubmission[];
  onNavigate: (page: any) => void;
  onStartTask: (task: Task) => void;
  onOpenAdmin: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  wallet,
  tasks,
  submissions,
  onNavigate,
  onStartTask,
  onOpenAdmin
}) => {
  const completedCount = submissions.filter((s) => s.status === 'Approved').length;
  const pendingCount = submissions.filter((s) => s.status === 'Pending').length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl transform translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Welcome back, {user.name}!</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Complete Tasks &amp; Earn Daily Cash 🚀
          </h1>

          <p className="text-xs sm:text-sm text-indigo-100 max-w-lg leading-relaxed">
            Your trusted reward platform. Finish simple social tasks, surveys, and app installs to withdraw cash instantly.
          </p>
        </div>
      </div>

      {/* Admin Quick Access Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
            <Shield className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm">Admin Portal Access</h3>
            <p className="text-[11px] text-slate-400">Login with <span className="text-amber-400 font-mono">subhodip7</span> / <span className="text-amber-400 font-mono">subhodip8</span></p>
          </div>
        </div>
        <button
          onClick={onOpenAdmin}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs shrink-0"
        >
          Open Admin
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {/* Available Balance */}
        <div
          onClick={() => onNavigate('wallet')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition cursor-pointer space-y-1 group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Available Balance</span>
            <WalletIcon className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
            ₹{wallet.available_balance.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold flex items-center">
            <span>Tap to withdraw</span>
            <ChevronRight className="w-3 h-3 ml-0.5" />
          </div>
        </div>

        {/* Total Earned */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Earned</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            ₹{wallet.total_earned.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">Lifetime earnings</div>
        </div>

        {/* Completed Tasks */}
        <div
          onClick={() => onNavigate('tasks')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Completed Tasks</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {completedCount}
          </div>
          <div className="text-[10px] text-blue-600 font-bold">View all tasks</div>
        </div>

        {/* Pending Rewards */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Pending Rewards</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600">
            {pendingCount}
          </div>
          <div className="text-[10px] text-slate-400">Under admin review</div>
        </div>

        {/* Referral Earnings */}
        <div
          onClick={() => onNavigate('refer')}
          className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Referral Earnings</span>
            <Share2 className="w-4 h-4 text-violet-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-violet-700">₹150</div>
          <div className="text-[10px] text-violet-600 font-bold">Invite friends</div>
        </div>

        {/* Today's Earnings */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Today's Earnings</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">₹125</div>
          <div className="text-[10px] text-emerald-600 font-semibold">+15% from yesterday</div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-4 gap-2.5">
        <button
          onClick={() => onNavigate('tasks')}
          className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-2xl flex flex-col items-center justify-center space-y-1 transition cursor-pointer text-indigo-900 font-bold text-xs"
        >
          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          <span>Tasks</span>
        </button>
        <button
          onClick={() => onNavigate('wallet')}
          className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center space-y-1 transition cursor-pointer text-emerald-900 font-bold text-xs"
        >
          <WalletIcon className="w-5 h-5 text-emerald-600" />
          <span>Wallet</span>
        </button>
        <button
          onClick={() => onNavigate('withdraw')}
          className="p-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl flex flex-col items-center justify-center space-y-1 transition cursor-pointer text-amber-900 font-bold text-xs"
        >
          <Award className="w-5 h-5 text-amber-600" />
          <span>Withdraw</span>
        </button>
        <button
          onClick={() => onNavigate('refer')}
          className="p-3 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-2xl flex flex-col items-center justify-center space-y-1 transition cursor-pointer text-violet-900 font-bold text-xs"
        >
          <Share2 className="w-5 h-5 text-violet-600" />
          <span>Refer &amp; Earn</span>
        </button>
      </div>

      {/* Available Tasks Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-base text-slate-900">Featured High-Paying Tasks</h2>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-3 hover:shadow-md transition"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {task.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{task.completion_time}</span>
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 leading-snug">{task.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{task.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm font-extrabold text-emerald-700">
                  +₹{task.reward_amount}
                </div>
                <button
                  onClick={() => onNavigate('tasks')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                >
                  Start Task
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
