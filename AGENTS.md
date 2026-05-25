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
- Android-only code paths (`Platform.OS === 'android'`, `content://` URIs) have been removed

## Code Review Guidelines
- Flag any Android-only or cross-platform assumptions
- Sensitive secrets/tokens must stay in `expo-secure-store` (never `localStorage`; avoid `AsyncStorage` for auth)
- Prefer existing patterns:
  - Server state: React Query hooks under `src/hooks/{domain}/` (organized by feature domain)
  - Auth/session state: Zustand stores under `src/store/`
  - HTTP: Axios client in `src/api/client.ts` + endpoints in `src/api/endpoints/{domain}/`
  - Navigation: `src/navigation/`
- Keep environment usage centralized in `src/config/env.ts`

## Folder Structure

Code is organized by **feature domain** with local `components/` and `hooks/` directories:

```
src/
  api/endpoints/              # Domain-organized API endpoint modules
    tasks/                    #   taskTypes, taskCrudApi, taskCategoryApi, taskTimelineApi, ...
    uploads/                  #   cloudinaryUploadApi, uploadQueue*, taskSubmissionQueue*, ...
    studio/                   #   productApi, productCategoryApi, productMappers
  hooks/                      # Domain-organized React Query hooks
    tasks/                    #   useTasks, useTaskDelegation, useTaskTimeline, ...
    reviews/                  #   useReviews
    infrastructure/           #   useOutlets, useOutletTypes
    studio/                   #   useProducts
    analytics/                #   useAnalytics
  components/shared/          # Truly shared UI components (DatePickerModal, StarRating, StatusBadge, etc.)
  screens/{feature}/          # Screen composition files + feature-local code
    components/               #   Feature-specific UI components
    hooks/                    #   Feature-specific controller/state hooks
    {screen}.tsx              #   Thin screen files (~30–50 lines) composing hooks + components
```

### Large file splits completed

All major screens (>400 lines) have been decomposed:

| Screen | Original | Components + Hooks |
|--------|----------|--------------------|
| TasksScreen.tsx | ~2043 lines | TaskBoardHeader, TaskFiltersToolbar, TaskFilterSheet, OpenTaskList, CompletedTasksAccordion, TaskAttachmentsSheet, useTasksBoardState, useTaskCounters |
| CreateTaskScreen.tsx | ~1742 lines | CreateTaskForm, TaskRecurrenceSection, TaskAttachmentComposer, TaskAttachmentPreviewList, TaskPickerSheets, useCreateTaskFormState, useTaskAttachmentUploads |
| TaskDetailScreen.tsx | ~2365 lines | TaskDetailHeader, TaskSummaryCard, TaskActivityTimeline, TaskSubmissionSheet, TaskEditSheet, TaskAttachmentViewer, SubmissionBlock, useTaskDetailController, useTaskAudioController |
| TaskCategoriesScreen.tsx | ~552 lines | TaskCategoryList, TaskCategoryFormSheet, useTaskCategoryCrud |
| OverviewScreen.tsx | ~1025 lines | OverviewTopPanel, CsatFlipCard, TrendlineChartCard, QuickInsightsRow, OutletFeedbackSection, useOverviewDashboardModel |
| ReviewsScreen.tsx | ~1448 lines | ReviewsAnalyticsSection, HeatmapSection, CriticalFeedbackSection, AllReviewsSection, ReviewsFilterSheet, OutletSelectorSheet, useReviewsFilterState |
| ReviewDetailScreen.tsx | ~1192 lines | ReviewSummaryCard, ReviewResponsesSection, ComplaintResolutionForm, ResolutionDetailsSection, ReviewAttachmentBlock, useComplaintResolutionState |
| InfrastructureScreen.tsx | ~857 lines | OutletCard, OutletEditorSheet, OutletQrSheet, useOutletListState, useOutletQrActions |
| CreateOutletScreen.tsx | ~440 lines | OutletForm, OutletPickers, useOutletFormState |
| OutletTypesScreen.tsx | ~553 lines | OutletTypeList, OutletTypeFormSheet, useOutletTypeCrud |
| StudioScreen.tsx | ~1946 lines | StudioCatalogueTab, StudioAiOrdersTab, StudioUploadsTab, ProductFormSheet, CategoryFormSheet, CategoryManagerSheet, AgeRangeFilterSheet, useStudioState |
| ManagersScreen.tsx | ~648 lines | ManagersList, ManagerRow, ManagerEditorSheet, useManagersState |
| FormBuilderScreen.tsx | ~740 lines | FormBuilderList, FormEditorSheet, QuestionEditorCard, QuestionTypePickerSheet, useFormEditorState |

### API endpoint splits completed

Large monolithic API files have been split into domain directories:
- `src/api/endpoints/tasks.ts` → `src/api/endpoints/tasks/{taskTypes,taskMappers,taskCrudApi,taskCategoryApi,taskTimelineApi,taskUnreadApi,taskDelegationApi,taskAttachmentApi}/`
- `src/api/endpoints/upload.ts` → `src/api/endpoints/uploads/{cloudinaryUploadApi,cakeOrdersApi,uploadMappers}/`
- `src/api/endpoints/uploadQueue.ts` → `src/api/endpoints/uploads/{uploadQueueStore,uploadQueueProcessor,uploadQueueSubscriptions,uploadQueueApi}/`
- `src/api/endpoints/taskSubmissionQueue.ts` → `src/api/endpoints/uploads/{taskSubmissionQueueStore,taskSubmissionProcessor,taskSubmissionQueueApi}/`
- `src/api/endpoints/products.ts` → `src/api/endpoints/studio/{productApi,productCategoryApi,productMappers}/`

## Local development (reviewers/agents)

- Install deps: `npm install`
- Run iOS simulator (Expo Go): `npx expo start --ios`
- Validate: `npm run do` (Prettier + ESLint + TypeScript)
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
