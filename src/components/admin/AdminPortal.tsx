import React, { useState } from 'react';
import { Task, TaskSubmission, WithdrawalRequest, User, AppSettings, Wallet } from '../../types';
import {
  Shield,
  LayoutDashboard,
  CheckSquare,
  FileCheck,
  Users,
  Wallet as WalletIcon,
  Settings,
  LogOut,
  Plus,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  Edit,
  Save,
  ArrowLeft
} from 'lucide-react';
import { taskStore } from '../../utils/taskStore';

interface AdminPortalProps {
  onExitAdmin: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExitAdmin }) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'tasks' | 'submissions' | 'users' | 'withdrawals' | 'settings'
  >('dashboard');

  const [tasks, setTasks] = useState<Task[]>(() => taskStore.getTasks());
  const [submissions, setSubmissions] = useState<TaskSubmission[]>(() => taskStore.getSubmissions());
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => taskStore.getWithdrawals());
  const [users, setUsers] = useState<User[]>(() => taskStore.getUsersList());
  const [settings, setSettings] = useState<AppSettings>(() => taskStore.getSettings());

  // Task creation form state
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskReward, setNewTaskReward] = useState(50);
  const [newTaskCategory, setNewTaskCategory] = useState<any>('Social Tasks');
  const [newTaskTime, setNewTaskTime] = useState('2 mins');
  const [newTaskInstructions, setNewTaskInstructions] = useState('');
  const [newTaskProof, setNewTaskProof] = useState('Screenshot required');

  // Settings form state
  const [minWith, setMinWith] = useState(settings.min_withdrawal);
  const [refReward, setRefReward] = useState(settings.referral_reward);
  const [announcement, setAnnouncement] = useState(settings.announcement);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Stats calculation
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'Active').length;
  const totalTasks = tasks.length;
  const pendingSubs = submissions.filter((s) => s.status === 'Pending').length;
  const approvedSubs = submissions.filter((s) => s.status === 'Approved').length;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === 'Pending').length;
  const totalPaidOut = withdrawals
    .filter((w) => w.status === 'Paid')
    .reduce((sum, w) => sum + w.amount, 0);

  // Handle Approve Submission
  const handleApproveSubmission = (sub: TaskSubmission) => {
    const updatedSubs = submissions.map((s) => (s.id === sub.id ? { ...s, status: 'Approved' as const } : s));
    setSubmissions(updatedSubs);
    taskStore.saveSubmissions(updatedSubs);

    // Add reward to user wallet
    const wallet = taskStore.getWallet(sub.user_id);
    const updatedWallet: Wallet = {
      ...wallet,
      available_balance: wallet.available_balance + sub.reward_amount,
      total_earned: wallet.total_earned + sub.reward_amount
    };
    taskStore.saveWallet(updatedWallet, sub.user_id);

    // Add transaction record
    taskStore.addTransaction(
      {
        id: Date.now(),
        user_id: sub.user_id,
        type: 'Task Reward',
        amount: sub.reward_amount,
        description: `Task Approved: ${sub.task_title}`,
        created_at: new Date().toISOString()
      },
      sub.user_id
    );

    // Add notification
    taskStore.addNotification(
      {
        id: Date.now(),
        user_id: sub.user_id,
        title: 'Task Approved! 🎉',
        message: `Your submission for "${sub.task_title}" was approved. ₹${sub.reward_amount} added to your wallet!`,
        type: 'task',
        is_read: false,
        created_at: new Date().toISOString()
      },
      sub.user_id
    );
  };

  // Handle Reject Submission
  const handleRejectSubmission = (subId: number) => {
    const reason = prompt('Enter rejection reason:') || 'Proof invalid or incomplete.';
    const updatedSubs = submissions.map((s) =>
      s.id === subId ? { ...s, status: 'Rejected' as const, rejection_reason: reason } : s
    );
    setSubmissions(updatedSubs);
    taskStore.saveSubmissions(updatedSubs);
  };

  // Handle Withdrawal Status Update
  const handleUpdateWithdrawalStatus = (wId: number, status: 'Paid' | 'Rejected') => {
    const ref = status === 'Paid' ? `TEP-PAY-${Math.floor(100000 + Math.random() * 900000)}` : undefined;
    const updated = withdrawals.map((w) =>
      w.id === wId ? { ...w, status, transaction_ref: ref || w.transaction_ref } : w
    );
    setWithdrawals(updated);
    taskStore.saveWithdrawals(updated);
  };

  // Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: Task = {
      id: Date.now(),
      title: newTaskTitle,
      description: newTaskDesc,
      reward_amount: Number(newTaskReward),
      category: newTaskCategory,
      completion_time: newTaskTime,
      status: 'Active',
      instructions: newTaskInstructions,
      proof_required: newTaskProof,
      is_active: 1,
      created_at: new Date().toISOString()
    };

    taskStore.addTask(newTask);
    setTasks(taskStore.getTasks());
    setShowNewTaskModal(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskInstructions('');
  };

  const handleDeleteTask = (id: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      taskStore.deleteTask(id);
      setTasks(taskStore.getTasks());
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings = {
      ...settings,
      min_withdrawal: Number(minWith),
      referral_reward: Number(refReward),
      announcement
    };
    taskStore.saveSettings(updatedSettings);
    setSettings(updatedSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Admin Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base text-white">Task Earn Pro • Admin Portal</h1>
            <p className="text-[10px] text-slate-400">Secure Management Dashboard</p>
          </div>
        </div>

        <button
          onClick={onExitAdmin}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to App</span>
        </button>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-slate-950/60 border-b border-slate-800 px-4 overflow-x-auto flex space-x-2 py-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'tasks', label: 'Tasks Management', icon: CheckSquare },
          { id: 'submissions', label: `Submissions (${pendingSubs})`, icon: FileCheck },
          { id: 'users', label: 'Users', icon: Users },
          { id: 'withdrawals', label: `Withdrawals (${pendingWithdrawals})`, icon: WalletIcon },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Admin Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-semibold">Total Users</span>
                <div className="text-2xl font-black text-white">{totalUsers}</div>
                <span className="text-[10px] text-emerald-400">{activeUsers} Active</span>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-semibold">Total Tasks</span>
                <div className="text-2xl font-black text-white">{totalTasks}</div>
                <span className="text-[10px] text-indigo-400">Active earning tasks</span>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-semibold">Pending Submissions</span>
                <div className="text-2xl font-black text-amber-400">{pendingSubs}</div>
                <span className="text-[10px] text-slate-400">Needs review</span>
              </div>
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400 font-semibold">Total Payouts Paid</span>
                <div className="text-2xl font-black text-emerald-400">₹{totalPaidOut}</div>
                <span className="text-[10px] text-slate-400">Successful withdrawals</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. TASKS MANAGEMENT TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Manage Earning Tasks</h2>
              <button
                onClick={() => setShowNewTaskModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Task</span>
              </button>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Reward</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-bold text-white">{t.title}</td>
                      <td className="p-3 text-indigo-300">{t.category}</td>
                      <td className="p-3 font-extrabold text-emerald-400">₹{t.reward_amount}</td>
                      <td className="p-3 text-slate-400">{t.completion_time}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteTask(t.id)}
                          className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. SUBMISSIONS MANAGEMENT TAB */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Task Proof Submissions Review</h2>
            <div className="space-y-3">
              {submissions.length === 0 ? (
                <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                  No task submissions found.
                </div>
              ) : (
                submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-sm">{sub.task_title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.status === 'Approved'
                              ? 'bg-emerald-950 text-emerald-300'
                              : sub.status === 'Pending'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        User: <span className="text-indigo-400 font-bold">{sub.user_name}</span>
                      </p>
                      <p className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono">
                        Proof: {sub.proof_text}
                      </p>
                      <span className="text-[10px] text-slate-500 block">
                        Reward: ₹{sub.reward_amount} • {new Date(sub.created_at).toLocaleString()}
                      </span>
                    </div>

                    {sub.status === 'Pending' && (
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleApproveSubmission(sub)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve (+₹{sub.reward_amount})</span>
                        </button>
                        <button
                          onClick={() => handleRejectSubmission(sub.id)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 4. USERS MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Registered Users</h2>
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Referral Code</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-bold text-white">{u.name}</td>
                      <td className="p-3 text-slate-300">{u.email}</td>
                      <td className="p-3 font-mono text-indigo-300">{u.user_id_str}</td>
                      <td className="p-3 font-mono text-amber-300">{u.referral_code}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300">
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. WITHDRAWALS MANAGEMENT TAB */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">Withdrawal Requests Management</h2>
            <div className="space-y-3">
              {withdrawals.length === 0 ? (
                <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                  No withdrawal requests found.
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-base">₹{w.amount}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            w.status === 'Paid'
                              ? 'bg-emerald-950 text-emerald-300'
                              : w.status === 'Pending'
                              ? 'bg-amber-950 text-amber-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        User: <span className="font-bold text-indigo-400">{w.user_name}</span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {w.payment_method}: <span className="font-mono text-amber-300">{w.payment_details}</span>
                      </p>
                      {w.transaction_ref && (
                        <p className="text-[10px] font-mono text-slate-500 mt-1">Ref: {w.transaction_ref}</p>
                      )}
                    </div>

                    {w.status === 'Pending' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUpdateWithdrawalStatus(w.id, 'Paid')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Mark Paid
                        </button>
                        <button
                          onClick={() => handleUpdateWithdrawalStatus(w.id, 'Rejected')}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 space-y-4 max-w-lg">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Platform Settings</h2>

            {settingsSaved && (
              <div className="p-3 bg-emerald-950 text-emerald-300 rounded-xl text-xs font-bold">
                Settings saved successfully!
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Minimum Withdrawal Amount (₹)</label>
              <input
                type="number"
                value={minWith}
                onChange={(e) => setMinWith(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Referral Bonus Reward (₹)</label>
              <input
                type="number"
                value={refReward}
                onChange={(e) => setRefReward(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Platform Announcement Banner</label>
              <textarea
                rows={2}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white resize-none"
              />
            </div>

            <button
              type="submit"
              className="py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
            >
              Save Platform Settings
            </button>
          </form>
        )}
      </main>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateTask} className="bg-slate-950 rounded-3xl border border-slate-800 p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">Create New Task</h3>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Task Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Follow Instagram page"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Category *</label>
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="Daily Tasks">Daily Tasks</option>
                <option value="Social Tasks">Social Tasks</option>
                <option value="App/Website Tasks">App/Website Tasks</option>
                <option value="Survey Tasks">Survey Tasks</option>
                <option value="Special Tasks">Special Tasks</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Reward (₹) *</label>
                <input
                  type="number"
                  required
                  value={newTaskReward}
                  onChange={(e) => setNewTaskReward(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Est. Time *</label>
                <input
                  type="text"
                  required
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Description *</label>
              <textarea
                required
                rows={2}
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Instructions *</label>
              <textarea
                required
                rows={2}
                value={newTaskInstructions}
                onChange={(e) => setNewTaskInstructions(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white resize-none"
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Create Task
              </button>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
