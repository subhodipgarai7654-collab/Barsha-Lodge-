import React, { useState } from 'react';
import { Task, TaskSubmission, User } from '../../types';
import { CheckCircle2, Clock, Award, Upload, ArrowLeft, X, Sparkles, Send } from 'lucide-react';
import { taskStore } from '../../utils/taskStore';

interface TasksPageProps {
  tasks: Task[];
  user: User;
  onSubmissionAdded: (sub: TaskSubmission) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ tasks, user, onSubmissionAdded }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTaskForModal, setActiveTaskForModal] = useState<Task | null>(null);
  const [proofText, setProofText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const categories = ['All', 'Daily Tasks', 'Social Tasks', 'App/Website Tasks', 'Survey Tasks', 'Special Tasks'];

  const filteredTasks = tasks.filter((t) => {
    if (selectedCategory === 'All') return true;
    return t.category === selectedCategory;
  });

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskForModal || !proofText.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newSub: TaskSubmission = {
        id: Date.now(),
        task_id: activeTaskForModal.id,
        task_title: activeTaskForModal.title,
        user_id: user.id,
        user_name: user.name,
        proof_text: proofText.trim(),
        reward_amount: activeTaskForModal.reward_amount,
        status: 'Pending', // Admin review required
        created_at: new Date().toISOString()
      };

      taskStore.addSubmission(newSub);
      onSubmissionAdded(newSub);

      setIsSubmitting(false);
      setSuccessMsg('Proof submitted successfully! Your submission is now Pending admin review.');
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTaskForModal(null);
        setProofText('');
      }, 2000);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Earn Rewards &amp; Complete Tasks
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Choose from available tasks, submit proof, and get paid instantly upon approval.
        </p>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-2 bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-2">
            <p className="font-bold text-slate-700 text-sm">No tasks found in this category</p>
            <p className="text-xs text-slate-400">Please select another category or check back later.</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {task.category}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{task.completion_time}</span>
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900">{task.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Reward</span>
                  <span className="text-base font-extrabold text-emerald-700">+₹{task.reward_amount}</span>
                </div>

                <button
                  onClick={() => setActiveTaskForModal(task)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer active:scale-95"
                >
                  Start Task
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Task Flow Modal (Start Task → Instructions → Submit Proof → Pending) */}
      {activeTaskForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in duration-200 relative">
            <button
              onClick={() => setActiveTaskForModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeTaskForModal.category}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-1">{activeTaskForModal.title}</h2>
              <p className="text-xs text-slate-500">{activeTaskForModal.description}</p>
            </div>

            {/* Reward Badge */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900">Task Reward</span>
              <span className="text-lg font-black text-emerald-700">+₹{activeTaskForModal.reward_amount}</span>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Instructions:</h4>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {activeTaskForModal.instructions}
              </div>
            </div>

            {/* Proof Form */}
            <form onSubmit={handleSubmitProof} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Submit Proof (Required) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={`Enter proof details: e.g. ${activeTaskForModal.proof_required}`}
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {successMsg ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting Proof...' : 'Submit Proof for Review'}</span>
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
