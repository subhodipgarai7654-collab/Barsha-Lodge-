import React from 'react';
import { Bell, Shield, User as UserIcon, Wallet, Download } from 'lucide-react';
import { User, Wallet as WalletType } from '../types';
import { AppPage } from './BottomNavBar';

interface HeaderProps {
  user: User;
  wallet: WalletType;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
  onNavigate: (page: AppPage) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  wallet,
  unreadCount,
  onOpenNotifications,
  onOpenAdmin,
  onNavigate
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-2 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-md group-hover:scale-105 transition">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-extrabold text-sm sm:text-lg text-slate-900 tracking-tight">
                  Task Earn Pro
                </span>
                <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded-full">
                  PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Complete &amp; Earn</p>
            </div>
          </button>

          {/* Right Section */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Wallet Balance Pill */}
            <button
              onClick={() => onNavigate('wallet')}
              className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 font-extrabold text-xs shadow-xs hover:bg-emerald-100 transition cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>₹{wallet.available_balance.toLocaleString()}</span>
            </button>

            {/* APK Download Button */}
            <button
              onClick={() => onNavigate('apk')}
              className="hidden md:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              title="Download Android APK"
            >
              <Download className="w-3.5 h-3.5" />
              <span>APK App</span>
            </button>

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] sm:text-[10px] flex items-center justify-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Admin Portal Button */}
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              title="Admin Portal"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden xs:inline">Admin</span>
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => onNavigate('profile')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm hover:ring-2 hover:ring-indigo-400 transition cursor-pointer"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
