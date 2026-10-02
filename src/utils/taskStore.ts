import { Task, TaskSubmission, Wallet, Transaction, WithdrawalRequest, ReferralData, AppNotification, AppSettings, User } from '../types';

const INITIAL_SETTINGS: AppSettings = {
  app_name: 'Task Earn Pro',
  tagline: 'Complete Tasks • Earn Rewards • Withdraw Easily',
  min_withdrawal: 250,
  referral_reward: 50,
  referral_percentage: 10,
  contact_email: 'support@taskearnpro.com',
  announcement: '🔥 Welcome to Task Earn Pro! Complete daily tasks & earn instant rewards.',
  maintenance_mode: 0,
  logo_text: 'TEP'
};

const INITIAL_TASKS: Task[] = [
  {
    id: 1,
    title: 'Daily Check-in Bonus',
    description: 'Open the app and claim your daily active reward instantly.',
    reward_amount: 15,
    category: 'Daily Tasks',
    completion_time: '10 secs',
    status: 'Active',
    instructions: 'Click Start Task and claim your daily reward.',
    proof_required: 'System verified daily check-in',
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Join Official Telegram Channel',
    description: 'Join our community channel for daily bonus task alerts and loot codes.',
    reward_amount: 50,
    category: 'Social Tasks',
    completion_time: '1 min',
    status: 'Active',
    instructions: '1. Click start task to open Telegram.\n2. Join our official channel.\n3. Take a screenshot of joined status and upload proof.',
    proof_required: 'Screenshot showing joined channel status',
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Subscribe YouTube Channel & Bell Icon',
    description: 'Subscribe to our official YouTube channel and watch latest earning tips.',
    reward_amount: 75,
    category: 'Social Tasks',
    completion_time: '2 mins',
    status: 'Active',
    instructions: '1. Subscribe to channel.\n2. Like latest video.\n3. Upload screenshot with your username visible.',
    proof_required: 'Screenshot of subscribed channel with username',
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Install Sponsor App & Register',
    description: 'Download partner finance app, register with mobile number and verify OTP.',
    reward_amount: 150,
    category: 'App/Website Tasks',
    completion_time: '5 mins',
    status: 'Active',
    instructions: '1. Download app via link.\n2. Register with your phone number.\n3. Submit your registered mobile number as proof.',
    proof_required: 'Registered mobile number & profile screenshot',
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 5,
    title: 'Quick Feedback Survey',
    description: 'Complete a 2-minute survey about your online earning preferences.',
    reward_amount: 60,
    category: 'Survey Tasks',
    completion_time: '3 mins',
    status: 'Active',
    instructions: 'Answer all 5 questions honestly and submit.',
    proof_required: 'Survey completion confirmation code',
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 6,
    title: 'Special VIP Offer: Spin & Win',
    description: 'Participate in the weekend mega spin event and win guaranteed cash.',
    reward_amount: 200,
    category: 'Special Tasks',
    completion_time: '2 mins',
    status: 'Active',
    instructions: 'Spin the lucky wheel and submit winning screenshot.',
    proof_required: 'Spin winning result screenshot',
    is_active: 1,
    created_at: new Date().toISOString()
  }
];

const INITIAL_USER: User = {
  id: 1,
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  phone: '9876543210',
  user_id_str: 'TEP88924',
  referral_code: 'ALEX2026',
  status: 'Active',
  role: 'user',
  created_at: new Date().toISOString()
};

const INITIAL_WALLET: Wallet = {
  user_id: 1,
  available_balance: 450,
  pending_balance: 150,
  total_earned: 1250,
  total_withdrawn: 800
};

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 1,
    user_id: 1,
    type: 'Task Reward',
    amount: 100,
    description: 'Completed YouTube Subscription Task',
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 2,
    user_id: 1,
    type: 'Referral Reward',
    amount: 50,
    description: 'Referral bonus from friend signup (Rahul S.)',
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 3,
    user_id: 1,
    type: 'Withdrawal',
    amount: -300,
    description: 'UPI Withdrawal to 9876543210@paytm (Paid)',
    created_at: new Date(Date.now() - 259200000).toISOString()
  }
];

const INITIAL_SUBMISSIONS: TaskSubmission[] = [
  {
    id: 101,
    task_id: 2,
    task_title: 'Join Official Telegram Channel',
    user_id: 1,
    user_name: 'Alex Johnson',
    proof_text: 'Joined as @alex_j and liked pinned post',
    reward_amount: 50,
    status: 'Pending',
    created_at: new Date().toISOString()
  },
  {
    id: 102,
    task_id: 3,
    task_title: 'Subscribe YouTube Channel & Bell Icon',
    user_id: 1,
    user_name: 'Alex Johnson',
    proof_text: 'Subscribed with Google account Alex J',
    reward_amount: 75,
    status: 'Approved',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const INITIAL_WITHDRAWALS: WithdrawalRequest[] = [
  {
    id: 1,
    user_id: 1,
    user_name: 'Alex Johnson',
    amount: 300,
    payment_method: 'UPI',
    payment_details: '9876543210@paytm',
    status: 'Paid',
    transaction_ref: 'UPI/2026/TEP89421',
    created_at: new Date(Date.now() - 259200000).toISOString()
  }
];

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 1,
    user_id: 1,
    title: 'Task Approved! 🎉',
    message: 'Your proof for YouTube Subscription was approved. ₹75 added to wallet!',
    type: 'task',
    is_read: false,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    user_id: 1,
    title: 'Withdrawal Successful ✅',
    message: 'Your withdrawal request of ₹300 has been paid successfully via UPI.',
    type: 'withdrawal',
    is_read: true,
    created_at: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: 3,
    user_id: 1,
    title: 'New High Paying Task!',
    message: 'Install Sponsor App task is now live. Earn ₹150 instantly.',
    type: 'task',
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString()
  }
];

export const taskStore = {
  getSettings(): AppSettings {
    const data = localStorage.getItem('tep_settings');
    return data ? JSON.parse(data) : INITIAL_SETTINGS;
  },
  saveSettings(settings: AppSettings) {
    localStorage.setItem('tep_settings', JSON.stringify(settings));
  },

  getTasks(): Task[] {
    const data = localStorage.getItem('tep_tasks');
    return data ? JSON.parse(data) : INITIAL_TASKS;
  },
  saveTasks(tasks: Task[]) {
    localStorage.setItem('tep_tasks', JSON.stringify(tasks));
  },
  addTask(task: Task) {
    const tasks = this.getTasks();
    tasks.unshift(task);
    this.saveTasks(tasks);
  },
  updateTask(updated: Task) {
    const tasks = this.getTasks().map((t) => (t.id === updated.id ? updated : t));
    this.saveTasks(tasks);
  },
  deleteTask(id: number) {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    this.saveTasks(tasks);
  },

  getCurrentUser(): User {
    const data = localStorage.getItem('tep_current_user');
    return data ? JSON.parse(data) : INITIAL_USER;
  },
  saveCurrentUser(user: User) {
    localStorage.setItem('tep_current_user', JSON.stringify(user));
  },

  getWallet(userId = 1): Wallet {
    const data = localStorage.getItem(`tep_wallet_${userId}`);
    return data ? JSON.parse(data) : INITIAL_WALLET;
  },
  saveWallet(wallet: Wallet, userId = 1) {
    localStorage.setItem(`tep_wallet_${userId}`, JSON.stringify(wallet));
  },

  getTransactions(userId = 1): Transaction[] {
    const data = localStorage.getItem(`tep_transactions_${userId}`);
    return data ? JSON.parse(data) : INITIAL_TRANSACTIONS;
  },
  addTransaction(tx: Transaction, userId = 1) {
    const list = this.getTransactions(userId);
    list.unshift(tx);
    localStorage.setItem(`tep_transactions_${userId}`, JSON.stringify(list));
  },

  getSubmissions(): TaskSubmission[] {
    const data = localStorage.getItem('tep_submissions');
    return data ? JSON.parse(data) : INITIAL_SUBMISSIONS;
  },
  saveSubmissions(subs: TaskSubmission[]) {
    localStorage.setItem('tep_submissions', JSON.stringify(subs));
  },
  addSubmission(sub: TaskSubmission) {
    const list = this.getSubmissions();
    list.unshift(sub);
    this.saveSubmissions(list);
  },

  getWithdrawals(): WithdrawalRequest[] {
    const data = localStorage.getItem('tep_withdrawals');
    return data ? JSON.parse(data) : INITIAL_WITHDRAWALS;
  },
  saveWithdrawals(list: WithdrawalRequest[]) {
    localStorage.setItem('tep_withdrawals', JSON.stringify(list));
  },
  addWithdrawal(req: WithdrawalRequest) {
    const list = this.getWithdrawals();
    list.unshift(req);
    this.saveWithdrawals(list);
  },

  getNotifications(userId = 1): AppNotification[] {
    const data = localStorage.getItem(`tep_notifications_${userId}`);
    return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
  },
  saveNotifications(list: AppNotification[], userId = 1) {
    localStorage.setItem(`tep_notifications_${userId}`, JSON.stringify(list));
  },
  addNotification(notif: AppNotification, userId = 1) {
    const list = this.getNotifications(userId);
    list.unshift(notif);
    this.saveNotifications(list, userId);
  },

  getUsersList(): User[] {
    const data = localStorage.getItem('tep_users_list');
    return data ? JSON.parse(data) : [INITIAL_USER, { id: 2, name: 'Priya Sharma', email: 'priya@example.com', phone: '9123456789', user_id_str: 'TEP92102', referral_code: 'PRIYA11', status: 'Active', role: 'user', created_at: new Date().toISOString() }];
  },
  saveUsersList(users: User[]) {
    localStorage.setItem('tep_users_list', JSON.stringify(users));
  }
};
