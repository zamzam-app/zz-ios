# zz-ios

Internal admin app for Zam Zam — built with React Native + Expo.

## Stack

- React Native + Expo (SDK 54, managed workflow)
- React Navigation (bottom tabs + stack)
- React Query for server state
- Zustand for auth state
- Axios for HTTP
- TypeScript throughout

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

## Project structure

```
src/
├── api/          # Axios client + per-domain endpoint files
├── components/   # Shared UI components
├── hooks/        # React Query hooks per domain
├── navigation/   # Root, auth, and app navigators
├── screens/      # One folder per feature
├── store/        # Zustand stores
└── theme/        # theme.ts — all colors, spacing, typography
```

## Distribution

Distributed via **Expo EAS + TestFlight**.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login and configure (needs Apple Developer Account)
eas login
eas build:configure

# Submit a build to TestFlight
eas build --platform ios --profile preview
```

> TODO (Abin): Complete EAS setup once the Apple Developer Account is active.
