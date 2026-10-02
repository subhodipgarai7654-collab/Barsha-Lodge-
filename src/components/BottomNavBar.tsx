import React from 'react';
import { Home, CheckSquare, Wallet, Share2, User, Download } from 'lucide-react';

export type AppPage = 'home' | 'tasks' | 'wallet' | 'withdraw' | 'refer' | 'profile' | 'notifications' | 'apk';

interface BottomNavBarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  unreadCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activePage,
  onNavigate
}) => {
  const navItems = [
    { id: 'home' as AppPage, icon: Home, label: 'Home' },
    { id: 'tasks' as AppPage, icon: CheckSquare, label: 'Tasks' },
    { id: 'wallet' as AppPage, icon: Wallet, label: 'Wallet' },
    { id: 'apk' as AppPage, icon: Download, label: 'Download APK' },
    { id: 'profile' as AppPage, icon: User, label: 'Profile' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 shadow-lg flex items-center justify-around sm:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`transition duration-200 cursor-pointer flex flex-col items-center justify-center py-1 px-2.5 rounded-xl ${
              isActive
                ? 'bg-indigo-600 text-white font-bold shadow-md'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
            <span className="text-[9px] tracking-tight leading-tight mt-0.5">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
