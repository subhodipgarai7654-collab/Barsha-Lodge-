import React from 'react';
import { Smartphone, AlertTriangle, ExternalLink, Terminal } from 'lucide-react';

export const DownloadApkPage: React.FC = () => {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Android APK Build 📱
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Package ID: <code className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">com.taskearnpro.app</code>
        </p>
      </div>

      {/* APK Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Task Earn Pro APK</h2>
            <p className="text-xs text-slate-500 font-medium">Version: 1.0.0 • Min SDK: 26 (Android 8.0+)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">APK File Size</span>
            <span className="font-extrabold text-slate-900 text-sm">N/A</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
            <span className="text-slate-400 block text-[10px] font-bold uppercase">Build Status</span>
            <span className="font-extrabold text-amber-600 text-xs">Pending External Build</span>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900 leading-relaxed">
          <p className="font-extrabold text-sm">
            Android APK build cannot be generated directly in this environment.
          </p>
          <p>
            Because this preview container runs a Node.js/Vite web server without the Android SDK and Gradle, a signed native APK cannot be compiled directly here. Please use Bubblewrap CLI or GitHub Actions to generate the signed APK externally.
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h4 className="font-extrabold text-xs text-slate-900">How to generate the APK externally:</h4>
          <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-xl space-y-1 overflow-x-auto">
            <p className="text-emerald-400"># Install Bubblewrap CLI</p>
            <p>npm i -g @bubblewrap/cli</p>
            <p className="text-emerald-400 pt-1"># Initialize &amp; Build TWA APK</p>
            <p>bubblewrap init --manifest=https://your-domain.run.app/manifest.json</p>
            <p>bubblewrap build</p>
          </div>
        </div>
      </div>
    </div>
  );
};
