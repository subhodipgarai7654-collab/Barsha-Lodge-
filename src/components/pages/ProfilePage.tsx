import React, { useState } from 'react';
import { User } from '../../types';
import { User as UserIcon, Mail, Phone, Shield, Bell, Lock, LogOut, CheckCircle2 } from 'lucide-react';

interface ProfilePageProps {
  user: User;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Profile updated successfully!');
    setTimeout(() => {
      setSuccessMsg('');
      setIsEditing(false);
    }, 1500);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          My Account Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your personal details, security settings, and preferences.
        </p>
      </div>

      {/* User Info Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-extrabold text-slate-900">{user.name}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {user.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">User ID: {user.user_id_str}</p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Email Address</span>
              <span className="font-bold text-slate-900">{user.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Phone Number</span>
              <span className="font-mono font-bold text-slate-900">{user.phone || '9876543210'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400">Referral Code</span>
              <span className="font-mono font-bold text-indigo-600">{user.referral_code}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Account Type</span>
              <span className="font-bold uppercase text-slate-900">{user.role}</span>
            </div>

            <button
              onClick={() => setIsEditing(true)}
              className="w-full mt-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Account Actions / Options */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 text-xs">
        <button
          onClick={() => alert('Change password email sent.')}
          className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between font-bold text-slate-800 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <Lock className="w-4 h-4 text-indigo-600" />
            <span>Change Password</span>
          </div>
          <span className="text-slate-400">→</span>
        </button>

        <button
          onClick={() => alert('Notification preferences updated.')}
          className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between font-bold text-slate-800 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>Notification Settings</span>
          </div>
          <span className="text-slate-400">→</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full p-4 text-left hover:bg-rose-50 flex items-center justify-between font-bold text-rose-700 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Logout Account</span>
          </div>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
