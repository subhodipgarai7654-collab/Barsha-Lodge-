export interface Task {
  id: number;
  title: string;
  description: string;
  reward_amount: number;
  category: 'Daily Tasks' | 'Social Tasks' | 'App/Website Tasks' | 'Survey Tasks' | 'Special Tasks';
  completion_time: string; // e.g. "3 mins"
  status: 'Active' | 'Paused' | 'Completed';
  instructions: string;
  proof_required: string; // e.g. "Screenshot of subscribed channel"
  task_limit?: number;
  completed_count?: number;
  is_active: number; // 1 or 0
  created_at: string;
}

export interface TaskSubmission {
  id: number;
  task_id: number;
  task_title?: string;
  user_id: number;
  user_name: string;
  user_email?: string;
  proof_text: string;
  proof_image_url?: string;
  reward_amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejection_reason?: string;
  created_at: string;
}

export interface Wallet {
  user_id: number;
  available_balance: number;
  pending_balance: number;
  total_earned: number;
  total_withdrawn: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'Task Reward' | 'Referral Reward' | 'Withdrawal' | 'Bonus' | 'Admin Adjustment';
  amount: number;
  description: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: number;
  user_id: number;
  user_name: string;
  amount: number;
  payment_method: 'UPI' | 'Bank Transfer';
  payment_details: string; // UPI ID or Account/IFSC
  status: 'Pending' | 'Processing' | 'Paid' | 'Rejected';
  transaction_ref?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface ReferralData {
  user_id: number;
  referral_code: string;
  total_referrals: number;
  successful_referrals: number;
  referral_earnings: number;
}

export interface AppNotification {
  id: number;
  user_id?: number;
  title: string;
  message: string;
  type: 'task' | 'withdrawal' | 'referral' | 'admin' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface AppSettings {
  app_name: string;
  tagline: string;
  min_withdrawal: number;
  referral_reward: number;
  referral_percentage: number;
  contact_email: string;
  announcement: string;
  maintenance_mode: number;
  logo_text: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  user_id_str?: string;
  referral_code?: string;
  referred_by?: string;
  status?: 'Active' | 'Suspended';
  role: 'user' | 'admin';
  created_at?: string;
}

// Flexible legacy types with index signatures for backward compatibility
export interface Room {
  [key: string]: any;
}

export interface Booking {
  [key: string]: any;
}

export interface CustomerRecord {
  [key: string]: any;
}

export interface PaymentRecord {
  [key: string]: any;
}

export interface GalleryItem {
  [key: string]: any;
}

export interface FacilityItem {
  [key: string]: any;
}

export interface WebsiteSettings {
  [key: string]: any;
}

export interface DashboardStats {
  [key: string]: any;
}

export interface AIKnowledgeItem {
  [key: string]: any;
}

export interface Review {
  [key: string]: any;
}

export interface Coupon {
  [key: string]: any;
}
