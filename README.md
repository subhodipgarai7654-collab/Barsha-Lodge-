# Task Earn Pro — Complete Task & Earning Platform

Task Earn Pro is a full-featured reward platform where users complete simple tasks (surveys, app installs, social engagement) to earn coins and cash rewards, complete with an Admin management portal and automated GitHub Actions Android APK build pipeline.

---

## 🌟 Key Features

* **User Web App**:
  * Dashboard with Available Balance, Total Earned, Completed Tasks, and Referral earnings.
  * Task Hub categorized into Daily, Social, App Installs, and Surveys with instant proof submission.
  * Wallet & Withdrawal system supporting UPI and Bank Transfer.
  * Refer & Earn program with unique referral codes and share links.
  * In-app notification center and profile management.
* **Admin Management Portal**:
  * Secure Admin login (`subhodip7` / `subhodip8`).
  * Overview statistics and task approval/rejection queue.
  * User management and platform configuration.
* **Android APK Build Pipeline (GitHub Actions)**:
  * Automated TWA / Android APK compilation workflow (`.github/workflows/build-apk.yml`).

---

## 🚀 How to Build & Download the Android APK via GitHub Actions

1. **Push your project to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Task Earn Pro"
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```
2. **Open GitHub Actions**:
   * Navigate to your repository on GitHub and click on the **Actions** tab.
3. **Run the Workflow**:
   * Select the **"Build Android APK"** workflow.
   * Click **Run workflow** > Select branch `main` > Click **Run workflow**.
4. **Download the APK**:
   * Once the workflow finishes successfully (green checkmark ✔️), click on the run.
   * Scroll down to the **Artifacts** section at the bottom.
   * Download `TaskEarnPro-v1.0.0.apk` directly to your Android phone and install!

---

## 🔐 Admin Credentials

* **Username**: `subhodip7`
* **Password**: `subhodip8`

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

© 2026 Task Earn Pro. All rights reserved.
