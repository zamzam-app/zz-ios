# App Handover Guide

This document walks you through everything needed to take full ownership of the Zam Zam admin app and publish it under your own Apple Developer account. Follow the steps in order.

---

## Prerequisites

Before you start, make sure you have the following ready:

- **Apple Developer Account** — active and paid ($99/year). If you don't have one yet, enroll at [developer.apple.com/programs/enroll](https://developer.apple.com/enroll).
- **Access to App Store Connect** — this comes automatically with your Apple Developer account. Sign in at [appstoreconnect.apple.com](https://appstoreconnect.apple.com).
- **The codebase** — you already own the GitHub repository.
- **A computer with Node.js installed** — if you're not sure, download it from [nodejs.org](https://nodejs.org) (LTS version).

---

## Step 1 — Register the App's Bundle ID in Your Apple Developer Account

The Bundle ID is a unique identifier for your app. You need to register it under your account.

1. Go to [developer.apple.com](https://developer.apple.com) and sign in.
2. In the left sidebar, click **Identifiers**.
3. Click the **+** button (top right).
4. Select **App IDs** → click **Continue**.
5. Select **App** → click **Continue**.
6. Fill in the form:
   - **Description**: Zam Zam Admin App (or anything you like)
   - **Bundle ID**: Select **Explicit** and enter exactly: `com.zamzam.adminapp`
7. Scroll down and click **Continue**, then **Register**.

---

## Step 2 — Create the App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) and sign in.
2. Click **My Apps**.
3. Click the **+** button → **New App**.
4. Fill in the form:
   - **Platform**: iOS
   - **Name**: Zam Zam (or your preferred display name)
   - **Primary Language**: English
   - **Bundle ID**: Select `com.zamzam.adminapp` from the dropdown (it will appear after Step 1)
   - **SKU**: Any unique string you choose, e.g. `zamzam-admin-001`
5. Click **Create**.

Your app record is now created. You don't need to fill in any further details for now — that's only needed when you eventually publish to the App Store.

---

## Step 3 — Set Up an Expo / EAS Account

The app is built and submitted using EAS (Expo Application Services), which handles the build process and App Store submission for you.

1. Go to [expo.dev](https://expo.dev) and create a free account.
2. Open a terminal on your computer and run:
   ```
   npm install -g eas-cli
   ```
3. Once installed, log in:
   ```
   eas login
   ```
   Enter your Expo account credentials when prompted.

---

## Step 4 — Set Up the Project Under Your EAS Account

This links the codebase to your EAS account so builds are associated with you.

1. In your terminal, navigate to the project folder:
   ```
   cd path/to/your/repo
   ```
2. Run:
   ```
   eas project:init
   ```
3. Follow the prompts. When asked for a project name, use anything recognisable (e.g. `zamzam-admin`).
4. At the end, EAS will output a **Project ID** — a string that looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. Copy it.
5. Open the file `app.json` in the project root and find this section near the bottom:
   ```json
   "extra": {
     "eas": {
       "projectId": "a53bd63f-67c3-4a5a-98da-d030d05f010d"
     }
   }
   ```
   Replace the value of `projectId` with the new ID you just copied, so it looks like:
   ```json
   "extra": {
     "eas": {
       "projectId": "your-new-project-id-here"
     }
   }
   ```
6. Save the file and commit the change:
   ```
   git add app.json
   git commit -m "chore: update EAS project ID to new account"
   git push
   ```

---

## Step 5 — Build and Submit to TestFlight

This single command builds the app and submits it to TestFlight automatically.

```
eas build --platform ios --profile production --auto-submit
```

**What will happen:**

1. EAS will ask you to sign in with your **Apple ID** (the one linked to your Apple Developer account). Enter it when prompted.
2. EAS will automatically create the necessary certificates and provisioning profiles under your Apple Developer account. You don't need to do this manually.
3. The build will start on Expo's cloud servers. This takes approximately **15–20 minutes**.
4. Once the build is complete, EAS will automatically submit it to App Store Connect.
5. Apple will process the build, which takes a further **5–15 minutes**.
6. Once processed, the build will appear in your **TestFlight** tab in App Store Connect and you can invite testers from there.

---

## You're Done

At this point the app is fully under your ownership:

- The code lives in your GitHub repository.
- The app record is in your App Store Connect.
- Builds run under your EAS and Apple Developer accounts.

---

## Need Help?

If you run into any issues during these steps, reach out and we can work through it together.
