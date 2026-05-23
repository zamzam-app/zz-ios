# zz-ios

Internal admin app for Zam Zam — built with React Native + Expo.

## Stack

- React Native + Expo (SDK 54, managed workflow)
- React Navigation (bottom tabs + stack)
- React Query for server state
- Zustand for auth state
- Axios for HTTP
- TypeScript throughout

## Platform scope

This repo targets **iOS only**. Android and web commands may exist for convenience, but are **out of scope**.

## Getting started

```bash
npm install
```

Copy the env file and fill in the API URL:

```bash
cp .env.example .env
```

Run on iOS simulator:

```bash
npx expo start --ios
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_BASE_URL` | Backend base URL (without `/api` suffix) |
| `EXPO_PUBLIC_QR_REVIEW_BASE_URL` | Public web base URL used in outlet QR links |
| `EXPO_PUBLIC_ADMIN_EMAIL` | Admin email used for environment-based gating (defaults to `admin@zamzam.com`) |

## Project structure

```
src/
├── api/          # Axios client + per-domain endpoint files
├── components/   # Shared UI components
├── config/       # Environment/config helpers
├── constants/    # App-wide constants
├── hooks/        # React Query hooks per domain
├── navigation/   # Root, auth, and app navigators
├── screens/      # One folder per feature
├── store/        # Zustand stores
├── theme/        # theme.ts — all colors, spacing, typography
├── types/        # Shared TypeScript types
└── utils/        # Shared utilities
```

## Distribution

Distributed via **Expo EAS + TestFlight**.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login and configure (needs Apple Developer Account)
eas login
eas build:configure

# Validate locally
npm run check

# Submit a build to TestFlight
eas build --platform ios --profile preview
```
