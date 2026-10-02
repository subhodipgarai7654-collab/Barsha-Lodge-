import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNavBar, AppPage } from './components/BottomNavBar';
import { HomeDashboard } from './components/pages/HomeDashboard';
import { TasksPage } from './components/pages/TasksPage';
import { WalletPage } from './components/pages/WalletPage';
import { WithdrawPage } from './components/pages/WithdrawPage';
import { ReferEarnPage } from './components/pages/ReferEarnPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { DownloadApkPage } from './components/pages/DownloadApkPage';
import { NotificationsModal } from './components/pages/NotificationsModal';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminPortal } from './components/admin/AdminPortal';
import { taskStore } from './utils/taskStore';
import { User, Wallet, Task, TaskSubmission, WithdrawalRequest, Transaction, AppNotification } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('home');
  const [user, setUser] = useState<User>(() => taskStore.getCurrentUser());
  const [wallet, setWallet] = useState<Wallet>(() => taskStore.getWallet(1));
  const [tasks, setTasks] = useState<Task[]>(() => taskStore.getTasks());
  const [submissions, setSubmissions] = useState<TaskSubmission[]>(() => taskStore.getSubmissions());
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => taskStore.getWithdrawals());
  const [transactions, setTransactions] = useState<Transaction[]>(() => taskStore.getTransactions(1));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => taskStore.getNotifications(1));

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navigateToPage = (page: AppPage) => {
    if (page === 'admin' as any) {
      setShowAdminLogin(true);
      return;
    }
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, is_read: true }));
    setNotifications(updated);
    taskStore.saveNotifications(updated, 1);
  };

  const handleSubmissionAdded = (sub: TaskSubmission) => {
    setSubmissions([sub, ...submissions]);
    const newNotif: AppNotification = {
      id: Date.now(),
      user_id: 1,
      title: 'Task Submitted Successfully ⏳',
      message: `Your proof for "${sub.task_title}" is submitted and pending admin review.`,
      type: 'task',
      is_read: false,
      created_at: new Date().toISOString()
    };
    taskStore.addNotification(newNotif, 1);
    setNotifications(taskStore.getNotifications(1));
  };

  const handleWithdrawalRequested = (req: WithdrawalRequest) => {
    setWithdrawals([req, ...withdrawals]);
    setWallet(taskStore.getWallet(1));
    setTransactions(taskStore.getTransactions(1));
    const newNotif: AppNotification = {
      id: Date.now(),
      user_id: 1,
      title: 'Withdrawal Requested 💸',
      message: `Your withdrawal request of ₹${req.amount} via ${req.payment_method} is processing.`,
      type: 'withdrawal',
      is_read: false,
      created_at: new Date().toISOString()
    };
    taskStore.addNotification(newNotif, 1);
    setNotifications(taskStore.getNotifications(1));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-500 selection:text-white flex flex-col pb-16 sm:pb-0">
      {isAdminView ? (
        <AdminPortal onExitAdmin={() => setIsAdminView(false)} />
      ) : (
        <>
          <Header
            user={user}
            wallet={wallet}
            unreadCount={unreadCount}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onOpenAdmin={() => setShowAdminLogin(true)}
            onNavigate={navigateToPage}
          />

          <main className="flex-1">
            {currentPage === 'home' && (
              <HomeDashboard
                user={user}
                wallet={wallet}
                tasks={tasks}
                submissions={submissions}
                onNavigate={navigateToPage}
                onStartTask={(task) => navigateToPage('tasks')}
                onOpenAdmin={() => setShowAdminLogin(true)}
              />
            )}

            {currentPage === 'tasks' && (
              <TasksPage
                tasks={tasks}
                user={user}
                onSubmissionAdded={handleSubmissionAdded}
              />
            )}

            {currentPage === 'wallet' && (
              <WalletPage
                wallet={wallet}
                transactions={transactions}
                onNavigateToWithdraw={() => navigateToPage('withdraw')}
              />
            )}

            {currentPage === 'withdraw' && (
              <WithdrawPage
                wallet={wallet}
                withdrawals={withdrawals}
                onWithdrawalRequested={handleWithdrawalRequested}
              />
            )}

            {currentPage === 'refer' && <ReferEarnPage user={user} />}

            {currentPage === 'apk' && <DownloadApkPage />}

            {currentPage === 'profile' && (
              <ProfilePage
                user={user}
                onLogout={() => {
                  alert('Logged out successfully.');
                  window.location.reload();
                }}
              />
            )}
          </main>

          <BottomNavBar
            activePage={currentPage}
            onNavigate={navigateToPage}
            unreadCount={unreadCount}
          />
        </>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setShowNotificationsModal(false)}
          onMarkAllRead={handleMarkAllRead}
        />
      )}

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <AdminLogin
          onLoginSuccess={(token, adminUser) => {
            setShowAdminLogin(false);
            setIsAdminView(true);
          }}
          onClose={() => setShowAdminLogin(false)}
        />
      )}
    </div>
  );
}
