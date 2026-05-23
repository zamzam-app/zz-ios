# Code Organization Audit — Code Splitting + Restructure Plan

Repo: Expo + React Native (iOS-only)

## 1) Code Splitting Candidates

For each file that needs splitting: file path, approximate line count, reason, and suggested split units (names only).

- `src/screens/tasks/TaskDetailScreen.tsx` (~2365)
  - Reason: Mixed concerns (task summary, timeline feed, media upload, audio record/playback, submission editor, delegation, edit/viewer modals).
  - Split into: `TaskDetailHeader`, `TaskSummaryCard`, `TaskActivityTimeline`, `TaskSubmissionSheet`, `TaskEditSheet`, `TaskAttachmentViewer`, `useTaskDetailController`, `useTaskAudioController`.

- `src/screens/tasks/TasksScreen.tsx` (~2043)
  - Reason: Board rendering + filter UX + modal orchestration + attachment preview + server counts all in one file.
  - Split into: `TaskBoardHeader`, `TaskFiltersToolbar`, `TaskFilterSheet`, `OpenTaskList`, `CompletedTasksAccordion`, `TaskAttachmentsSheet`, `useTasksBoardState`, `useTaskCounters`.

- `src/screens/tasks/CreateTaskScreen.tsx` (~1742)
  - Reason: Form state + recurrence + attachment queue + audio capture + picker modals + submit queueing combined.
  - Split into: `CreateTaskForm`, `TaskRecurrenceSection`, `TaskAttachmentComposer`, `TaskAttachmentPreviewList`, `TaskPickerSheets`, `useCreateTaskFormState`, `useTaskAttachmentUploads`.

- `src/screens/more/StudioScreen.tsx` (~1946)
  - Reason: Three domains/tabs in one file (catalogue, AI orders, uploaded images) plus category/product CRUD modals.
  - Split into: `StudioCatalogueTab`, `StudioAiOrdersTab`, `StudioUploadsTab`, `ProductFormSheet`, `CategoryFormSheet`, `CategoryManagerSheet`, `AgeRangeFilterSheet`.

- `src/screens/reviews/ReviewsScreen.tsx` (~1448)
  - Reason: Analytics dashboard + critical feed + all-reviews feed + search/filter/outlet modals in one file.
  - Split into: `ReviewsAnalyticsSection`, `HeatmapSection`, `CriticalFeedbackSection`, `AllReviewsSection`, `ReviewsFilterSheet`, `OutletSelectorSheet`, `useReviewsFilterState`.

- `src/screens/reviews/ReviewDetailScreen.tsx` (~1192)
  - Reason: Review display + complaint resolution workflow + attachment upload/open logic combined.
  - Split into: `ReviewSummaryCard`, `ReviewResponsesSection`, `ComplaintResolutionForm`, `ResolutionDetailsSection`, `ReviewAttachmentBlock`, `useComplaintResolutionState`.

- `src/screens/overview/OverviewScreen.tsx` (~1025)
  - Reason: Top panel, flip card animation, trend chart, insights, feedback cards, navigation filter wiring combined.
  - Split into: `OverviewTopPanel`, `CsatFlipCard`, `TrendlineChartCard`, `QuickInsightsRow`, `OutletFeedbackSection`, `useOverviewDashboardModel`.

- `src/screens/infrastructure/InfrastructureScreen.tsx` (~857)
  - Reason: Outlet list + search + CRUD modals + QR generation/share + deep-link actions combined.
  - Split into: `OutletList`, `OutletCard`, `OutletEditorSheet`, `OutletQrSheet`, `useOutletListState`, `useOutletQrActions`.

- `src/screens/more/FormBuilderScreen.tsx` (~740)
  - Reason: Form list screen and full form-question editor in one file.
  - Split into: `FormBuilderList`, `FormEditorSheet`, `QuestionEditorCard`, `QuestionTypePickerSheet`, `useFormEditorState`.

- `src/screens/more/ManagersScreen.tsx` (~648)
  - Reason: Directory list/search and create/edit modal state/actions combined.
  - Split into: `ManagersList`, `ManagerRow`, `ManagerEditorSheet`, `useManagersState`.

- `src/screens/tasks/TaskCategoriesScreen.tsx` (~552)
  - Reason: List CRUD + modal validation bundled.
  - Split into: `TaskCategoryList`, `TaskCategoryFormSheet`, `useTaskCategoryCrud`.

- `src/screens/infrastructure/OutletTypesScreen.tsx` (~553)
  - Reason: Same CRUD/modal pattern as task categories; all concerns in one file.
  - Split into: `OutletTypeList`, `OutletTypeFormSheet`, `useOutletTypeCrud`.

- `src/screens/infrastructure/CreateOutletScreen.tsx` (~440)
  - Reason: Screen wrapper and reusable form content tightly coupled.
  - Split into: `OutletForm`, `OutletPickers`, `useOutletFormState`, `CreateOutletScreen`.

- `src/components/DelegationSheet.tsx` (~494)
  - Reason: UI + query filtering + mutation logic in one shared component.
  - Split into: `DelegationSheet`, `DelegationUserList`, `DelegationNoteInput`, `useDelegationState`.

- `src/components/TimelineEventShared.ts` (~253)
  - Reason: Icon mapping, color mapping, time formatting, file-size formatting mixed in one module.
  - Split into: `timelineEventIconMap`, `timelineEventColorMap`, `timelineDateFormatters`, `timelineFileFormatters`.

- `src/api/endpoints/tasks.ts` (~554)
  - Reason: One endpoint file handles task CRUD, categories, detail/timeline, unread, delegation, attachments, mapping/types.
  - Split into: `taskTypes`, `taskMappers`, `taskCrudApi`, `taskCategoryApi`, `taskTimelineApi`, `taskUnreadApi`, `taskDelegationApi`, `taskAttachmentApi`.

- `src/api/endpoints/taskSubmissionQueue.ts` (~268)
  - Reason: Persistence, retry policy, job processor, public API combined in one module.
  - Split into: `taskSubmissionQueueStore`, `taskSubmissionProcessor`, `taskSubmissionQueueApi`.

- `src/api/endpoints/uploadQueue.ts` (~306)
  - Reason: Queue store, retry scheduler, pub-sub, processor mixed.
  - Split into: `uploadQueueStore`, `uploadQueueProcessor`, `uploadQueueSubscriptions`, `uploadQueueApi`.

- `src/api/endpoints/upload.ts` (~196)
  - Reason: Generic Cloudinary upload and studio-specific cake endpoints mixed.
  - Split into: `cloudinaryUploadApi`, `cakeOrdersApi`, `uploadMappers`.

- `src/api/endpoints/products.ts` (~183)
  - Reason: Categories and products APIs bundled in one file.
  - Split into: `productApi`, `productCategoryApi`, `productMappers`.

## 2) Folder Restructure Plan

Structural issues and a revised folder tree proposal (iOS-only; preserve current patterns: React Query hooks in `src/hooks/`, Zustand in `src/store/`, Axios in `src/api/`, navigation in `src/navigation/`).

### Issues / Flags

- `src/components` is flat, but several components are feature-local (not truly shared): e.g. `DelegationSheet`, `TaskQueueStatusBanner`, `TimelineEvent*`, `ImagePickerButton`.
- `src/screens/more` mixes unrelated domains (studio, managers, forms, settings) and behaves like a domain bucket instead of a navigation bucket.
- Domain/API logic leaks into screens/components:
  - `src/screens/tasks/TasksScreen.tsx` calls `tasksApi.listPaginated` directly with `useQuery` (counts).
  - `src/screens/tasks/CreateTaskScreen.tsx` orchestrates upload queue and submission queue directly.
  - `src/screens/tasks/TaskDetailScreen.tsx` and `src/screens/reviews/ReviewDetailScreen.tsx` call `uploadToCloudinary` directly.
  - `src/components/ImagePickerButton.tsx` and `src/components/TaskQueueStatusBanner.tsx` contain queue-domain behavior in UI components.
- Pattern violations to fix via structure: move server-state fetching/orchestration into hooks modules; keep UI files compositional.
- iOS-only cleanup flags:
  - `src/screens/tasks/CreateTaskScreen.tsx` includes Android-only URI handling.
  - `src/components/DatePickerModal.tsx` keeps non-iOS picker path.

### Proposed `src/` Tree (High-Level)

- `src/api/endpoints/tasks/*` (split task endpoint domains)
- `src/api/endpoints/uploads/*` (cloudinary + queues)
- `src/api/endpoints/studio/*` (products/categories/cake-order endpoints)
- `src/hooks/tasks/*`, `src/hooks/reviews/*`, `src/hooks/infrastructure/*`, `src/hooks/studio/*`, `src/hooks/analytics/*`
- `src/components/shared/*` (only truly shared UI like `DatePickerModal`, `StarRating`)
- `src/screens/tasks/{screens,components,hooks,utils}/*`
- `src/screens/reviews/{screens,components,hooks,utils}/*`
- `src/screens/infrastructure/{screens,components,hooks,utils}/*`
- `src/screens/more/{menu,settings,managers,studio,forms}/*`
