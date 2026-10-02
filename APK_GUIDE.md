# Task Earn Pro — Android APK Build & GitHub Actions Guide

**Package ID**: `com.taskeearnpro.app`  
**App Name**: Task Earn Pro  
**Version**: `1.0.0`  
**Min SDK**: `26` (Android 8.0+)  
**Production URL**: `https://ais-pre-55lmvatnmsrph5pgbwl73z-221829813937.asia-east1.run.app`  

---

## 🚀 Step-by-Step Instructions to Generate & Download the APK

1. **Push your project to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Task Earn Pro Android TWA setup with live URL"
   git remote add origin <your-github-repository-url>
   git branch -M main
   git push -u origin main
   ```

2. **Navigate to GitHub Actions**:
   * Open your GitHub repository in your browser.
   * Click on the **Actions** tab at the top of the repository.

3. **Select the Workflow**:
   * On the left sidebar, click on **"Build Android APK"**.

4. **Run the Workflow**:
   * Click the **Run workflow** dropdown button.
   * Select the `main` branch.
   * Click the green **Run workflow** button.

5. **Download the Artifact**:
   * Wait ~30-60 seconds for the workflow to complete successfully (marked with a green checkmark ✔️).
   * Click on the completed workflow run.
   * Scroll down to the **Artifacts** section at the bottom.
   * Download **`TaskEarnPro-APK`**, extract or install the `.apk` file directly on your Android phone!

---

© 2026 Task Earn Pro. All rights reserved.
