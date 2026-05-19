# App Handover Guide

This document walks you through everything needed to take full ownership of the Zam Zam admin app and publish it under your own Apple Developer account. Follow the steps in order.

---

## Prerequisites

Before you start, make sure you have the following ready:

- **Apple Developer Account** — active and paid ($99/year). If you don't have one yet, enroll at [developer.apple.com/programs/enroll](https://developer.apple.com/enroll).
- **The codebase** — you already own the GitHub repository. Clone it to your computer if you haven't already.
- **A computer with Node.js installed** — if you're not sure, download it from [nodejs.org](https://nodejs.org) (LTS version).

---

## Step 1 — Create an App Record in App Store Connect

EAS needs an app record to exist in App Store Connect before it can submit builds. This is the only step that requires the web UI.

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) and sign in with your Apple ID.
2. Click **My Apps**.
3. Click the **+** button → **New App**.
4. Fill in the form:
   - **Platform**: iOS
   - **Name**: Zam Zam (or your preferred display name)
   - **Primary Language**: English
   - **Bundle ID**: If `com.zamzam.adminapp` doesn't appear in the dropdown, select **Register a new Bundle ID** and enter it exactly as: `com.zamzam.adminapp`
   - **SKU**: Any unique string, e.g. `zamzam-admin-001`
5. Click **Create**.

That's all you need to do in the browser. Everything else is handled from your terminal.

---

## Step 2 — Set Up EAS CLI

EAS (Expo Application Services) is the tool that builds and submits the app for you.

1. Open a terminal and install the EAS CLI:
   ```
   npm install -g eas-cli
   ```
2. Create a free account at [expo.dev](https://expo.dev) if you don't have one.
3. Log in:
   ```
   eas login
   ```
   Enter your Expo account credentials when prompted.

---

## Step 3 — Link the Project to Your EAS Account

This registers the project under your EAS account so all builds belong to you.

1. In your terminal, navigate to the project folder:
   ```
   cd path/to/your/repo
   ```
2. Run:
   ```
   eas project:init
   ```
3. Follow the prompts. When asked for a project name, use something recognisable (e.g. `zamzam-admin`).
4. EAS will output a **Project ID** — a string that looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Copy it.
5. Open `app.json` in the project root and find this section near the bottom:
   ```json
   "extra": {
     "eas": {
       "projectId": "a53bd63f-67c3-4a5a-98da-d030d05f010d"
     }
   }
   ```
   Replace the existing value with your new Project ID:
   ```json
   "extra": {
     "eas": {
       "projectId": "your-new-project-id-here"
     }
   }
   ```
6. Save the file, then commit and push:
   ```
   git add app.json
   git commit -m "chore: update EAS project ID"
   git push
   ```

---

## Step 4 — Build and Submit to TestFlight

Run this single command from inside the project folder:

```
eas build --platform ios --profile production --auto-submit
```

**What will happen, step by step:**

1. EAS will ask you to sign in with your **Apple ID** — use the one linked to your Apple Developer account.
2. EAS will automatically register the Bundle ID (`com.zamzam.adminapp`) under your Apple Developer account and generate all the necessary certificates and provisioning profiles. You don't need to do any of this manually.
3. The build will run on Expo's cloud servers — this takes roughly **15–20 minutes**.
4. Once the build is done, EAS will automatically submit it to App Store Connect.
5. Apple processes the build — this takes a further **5–15 minutes**.
6. The build will then appear under the **TestFlight** tab in App Store Connect, ready for you to invite testers.

---

## You're Done

At this point the app is fully under your ownership:

- The code lives in your GitHub repository.
- The app record is in your App Store Connect.
- All future builds and submissions run under your EAS and Apple Developer accounts.

---

## Need Help?

If you run into any issues during these steps, reach out and we can work through it together.
