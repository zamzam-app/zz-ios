# Project Context

## App Overview
- Expo + React Native app, **iOS only** (no Android)
- Internal admin app for Zam Zam (store/outlet operations + reviews)

## Tech Stack
- React Native + Expo (SDK 54, managed workflow)
- TypeScript
- React Query for server state
- Zustand for auth state
- Axios for HTTP
- React Navigation (bottom tabs + stack)

## iOS-Specific Notes
- Target: iOS only — ignore Android-specific suggestions
- Auth tokens are stored in `expo-secure-store` (`src/api/storage.ts`)
- `@react-native-async-storage/async-storage` is used only for non-sensitive queues/caches (e.g. upload/task submission queues)
- Avoid adding Android-only config/plugins; do not change `app.json` for Android

## Code Review Guidelines
- Flag any Android-only or cross-platform assumptions
- Sensitive secrets/tokens must stay in `expo-secure-store` (never `localStorage`; avoid `AsyncStorage` for auth)
- Prefer existing patterns:
  - Server state: React Query hooks under `src/hooks/`
  - Auth/session state: Zustand stores under `src/store/`
  - HTTP: Axios client in `src/api/client.ts` + endpoints in `src/api/endpoints/`
  - Navigation: `src/navigation/`
- Keep environment usage centralized in `src/config/env.ts`

## Local development (reviewers/agents)

- Install deps: `npm install`
- Run iOS simulator (Expo Go): `npx expo start --ios`
- Validate: `npm run check` (Prettier + ESLint + TypeScript)
- Targeted tests live under `test/` and are run via `npm run test:*` scripts in `package.json`

## Environment variables

Use `.env.example` as the source of truth for local `.env`.

| Variable | Required | Notes |
|----------|----------|------|
| `EXPO_PUBLIC_API_BASE_URL` | Yes | Backend base URL (no `/api` suffix); app derives `API_URL = ${BASE}/api` |
| `EXPO_PUBLIC_QR_REVIEW_BASE_URL` | No | Defaults to `https://zz-user.vercel.app` |
| `EXPO_PUBLIC_ADMIN_EMAIL` | No | Defaults to `admin@zamzam.com` |

## EAS / TestFlight (iOS)

- EAS config: `eas.json` (profiles: `development`, `preview`, `production`)
- Builds: `eas build --platform ios --profile preview`
- Production env vars are configured in `eas.json` under `build.production.env`

## Out of Scope
- Android compatibility
- Web support
