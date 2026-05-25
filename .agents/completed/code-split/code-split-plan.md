# Code Split Implementation Plan

Based on: `.agents/code-split.md` — Code Organization Audit

## Guiding Principles

1. **Keep the app building at every step.** Each step should leave the project in a working state (typecheck + build passes).
2. **Bottom-up order.** Extract foundations first (types, mappers, utils, API), then hooks, then components, then screens. This ensures imports exist before they're needed.
3. **One file at a time for large splits.** Each major file split is a dedicated step — no combining.
4. **Validate after every step.** Run `npm run check` (Prettier + ESLint + TypeScript) after each change.
5. **Delete old files after migration.** Once all references are updated, remove the original file.
6. **iOS-only awareness.** Don't introduce Android-only code; flag/remove any existing Android-only paths found in the source.

---

## Phase 0: Setup & Foundation

### Step 0.1 — Create the new directory structure

Create the proposed folder tree so files have destinations as they're extracted.

```text
src/
 api/endpoints/tasks/          # taskTypes, taskMappers, taskCrudApi, taskCategoryApi, taskTimelineApi, taskUnreadApi, taskDelegationApi, taskAttachmentApi
 api/endpoints/uploads/        # cloudinaryUploadApi, cakeOrdersApi, uploadMappers, uploadQueueStore, uploadQueueProcessor, uploadQueueSubscriptions, uploadQueueApi, taskSubmissionQueueStore, taskSubmissionProcessor, taskSubmissionQueueApi
 api/endpoints/studio/         # productApi, productCategoryApi, productMappers
 hooks/tasks/                  # (moved from src/hooks/useTasks.ts etc.)
 hooks/reviews/                # (moved from src/hooks/useReviews.ts etc.)
 hooks/infrastructure/         # (moved from src/hooks/useOutlets.ts etc.)
 hooks/studio/                 # (moved from src/hooks/useProducts.ts etc.)
 hooks/analytics/              # (moved from src/hooks/useAnalytics.ts etc.)
 components/shared/            # only truly shared UI
 screens/tasks/components/     # TaskDetailHeader, TaskSummaryCard, TaskActivityTimeline, TaskSubmissionSheet, TaskEditSheet, TaskAttachmentViewer, TaskBoardHeader, TaskFiltersToolbar, TaskFilterSheet, OpenTaskList, CompletedTasksAccordion, TaskAttachmentsSheet, CreateTaskForm, TaskRecurrenceSection, TaskAttachmentComposer, TaskAttachmentPreviewList, TaskPickerSheets, TaskCategoryList, TaskCategoryFormSheet
 screens/tasks/hooks/          # useTaskDetailController, useTaskAudioController, useTasksBoardState, useTaskCounters, useCreateTaskFormState, useTaskAttachmentUploads, useTaskCategoryCrud
 screens/reviews/components/   # ReviewsAnalyticsSection, HeatmapSection, CriticalFeedbackSection, AllReviewsSection, ReviewsFilterSheet, OutletSelectorSheet, ReviewSummaryCard, ReviewResponsesSection, ComplaintResolutionForm, ResolutionDetailsSection, ReviewAttachmentBlock
 screens/reviews/hooks/        # useReviewsFilterState, useComplaintResolutionState
 screens/overview/components/  # OverviewTopPanel, CsatFlipCard, TrendlineChartCard, QuickInsightsRow, OutletFeedbackSection
 screens/overview/hooks/       # useOverviewDashboardModel
 screens/infrastructure/components/  # OutletList, OutletCard, OutletEditorSheet, OutletQrSheet, OutletForm, OutletPickers, OutletTypeList, OutletTypeFormSheet
 screens/infrastructure/hooks/       # useOutletListState, useOutletQrActions, useOutletFormState, useOutletTypeCrud
 screens/more/studio/{components,hooks}/
 screens/more/managers/{components,hooks}/
 screens/more/forms/{components,hooks}/
 screens/more/settings/
 screens/more/menu/
```

**Validation:** Confirm directories exist with `ls -R src/screens/tasks/components`

---

## Phase 1: Extract Shared API Endpoints

### Step 1.1 — Split `src/api/endpoints/tasks.ts` (~554 lines)

- Create `src/api/endpoints/tasks/taskTypes.ts` — type definitions extracted from the file
- Create `src/api/endpoints/tasks/taskMappers.ts` — mapping/transformation functions
- Create `src/api/endpoints/tasks/taskCrudApi.ts` — CRUD operations
- Create `src/api/endpoints/tasks/taskCategoryApi.ts` — category endpoints
- Create `src/api/endpoints/tasks/taskTimelineApi.ts` — timeline endpoints
- Create `src/api/endpoints/tasks/taskUnreadApi.ts` — unread count endpoints
- Create `src/api/endpoints/tasks/taskDelegationApi.ts` — delegation endpoints
- Create `src/api/endpoints/tasks/taskAttachmentApi.ts` — attachment endpoints
- Create `src/api/endpoints/tasks/index.ts` — re-export all modules
- Update all imports across the codebase to point to the new module paths
- Delete `src/api/endpoints/tasks.ts`

**Validation:** `npm run check`

### Step 1.2 — Split `src/api/endpoints/upload.ts` (~196 lines)

- Create `src/api/endpoints/uploads/cloudinaryUploadApi.ts`
- Create `src/api/endpoints/uploads/cakeOrdersApi.ts`
- Create `src/api/endpoints/uploads/uploadMappers.ts`
- Create `src/api/endpoints/uploads/index.ts`
- Update imports; delete `src/api/endpoints/upload.ts`

**Validation:** `npm run check`

### Step 1.3 — Split `src/api/endpoints/products.ts` (~183 lines)

- Create `src/api/endpoints/studio/productApi.ts`
- Create `src/api/endpoints/studio/productCategoryApi.ts`
- Create `src/api/endpoints/studio/productMappers.ts`
- Create `src/api/endpoints/studio/index.ts`
- Update imports; delete `src/api/endpoints/products.ts`

**Validation:** `npm run check`

### Step 1.4 — Split `src/api/endpoints/uploadQueue.ts` (~306 lines)

- Create `src/api/endpoints/uploads/uploadQueueStore.ts`
- Create `src/api/endpoints/uploads/uploadQueueProcessor.ts`
- Create `src/api/endpoints/uploads/uploadQueueSubscriptions.ts`
- Create `src/api/endpoints/uploads/uploadQueueApi.ts`
- Update exports in `src/api/endpoints/uploads/index.ts`
- Delete `src/api/endpoints/uploadQueue.ts`

**Validation:** `npm run check`

### Step 1.5 — Split `src/api/endpoints/taskSubmissionQueue.ts` (~268 lines)

- Create `src/api/endpoints/uploads/taskSubmissionQueueStore.ts`
- Create `src/api/endpoints/uploads/taskSubmissionProcessor.ts`
- Create `src/api/endpoints/uploads/taskSubmissionQueueApi.ts`
- Update exports in `src/api/endpoints/uploads/index.ts`
- Delete `src/api/endpoints/taskSubmissionQueue.ts`

**Validation:** `npm run check`

---

## Phase 2: Organize Hooks into Domain Folders

### Step 2.1 — Move task-related hooks to `src/hooks/tasks/`

- Move `useTasks.ts` → `src/hooks/tasks/useTasks.ts`
- Move `useTaskDelegation.ts` → `src/hooks/tasks/useTaskDelegation.ts`
- Move `useTaskView.ts` → `src/hooks/tasks/useTaskView.ts`
- Move `useTaskTimeline.ts` → `src/hooks/tasks/useTaskTimeline.ts`
- Move `useTaskAttachments.ts` → `src/hooks/tasks/useTaskAttachments.ts`
- Move `useForms.ts` → `src/hooks/tasks/useForms.ts`
- Create `src/hooks/tasks/index.ts` — re-export all
- Update all imports; delete original files from `src/hooks/`

**Validation:** `npm run check`

### Step 2.2 — Move review-related hooks to `src/hooks/reviews/`

- Move `useReviews.ts` → `src/hooks/reviews/useReviews.ts`
- Move `useReviewCritical.ts` (if exists) or create the directory
- Create `src/hooks/reviews/index.ts`
- Update imports; delete original files from `src/hooks/`

**Validation:** `npm run check`

### Step 2.3 — Move infrastructure hooks to `src/hooks/infrastructure/`

- Move `useOutlets.ts` → `src/hooks/infrastructure/useOutlets.ts`
- Move `useOutletTypes.ts` → `src/hooks/infrastructure/useOutletTypes.ts`
- Create `src/hooks/infrastructure/index.ts`
- Update imports; delete original files from `src/hooks/`

**Validation:** `npm run check`

### Step 2.4 — Move studio/product hooks to `src/hooks/studio/`

- Move `useProducts.ts` → `src/hooks/studio/useProducts.ts`
- Create `src/hooks/studio/index.ts`
- Update imports; delete original files from `src/hooks/`

**Validation:** `npm run check`

### Step 2.5 — Move analytics hooks to `src/hooks/analytics/`

- Move `useAnalytics.ts` → `src/hooks/analytics/useAnalytics.ts`
- Create `src/hooks/analytics/index.ts`
- Update imports; delete original files from `src/hooks/`

**Validation:** `npm run check`

---

## Phase 3: Extract Shared Components to `components/shared/`

### Step 3.1 — Move truly shared components

- Move `DatePickerModal.tsx` → `components/shared/DatePickerModal.tsx`
- Move `StarRating.tsx` → `components/shared/StarRating.tsx`
- Move `FilterDropdown.tsx` → `components/shared/FilterDropdown.tsx`
- Move `StatusBadge.tsx` → `components/shared/StatusBadge.tsx`
- Move `UnreadBadge.tsx` → `components/shared/UnreadBadge.tsx`
- Move `ImagePickerButton.tsx` → `components/shared/ImagePickerButton.tsx`
- Update all imports; delete original files

**Validation:** `npm run check`

### Step 3.2 — Move delegation UI to its feature area

DelegationSheet is used primarily by tasks. Move it to `screens/tasks/components/` or keep as shared depending on actual usage.

- Audit all imports of `DelegationSheet` / `DelegationBanner`
- If only used in tasks → move to `screens/tasks/components/`
- If used across features → keep in `components/shared/`

**Validation:** `npm run check`

### Step 3.3 — Split `TimelineEventShared.ts` (~253 lines)

- Create `components/shared/timeline/timelineEventIconMap.ts`
- Create `components/shared/timeline/timelineEventColorMap.ts`
- Create `components/shared/timeline/timelineDateFormatters.ts`
- Create `components/shared/timeline/timelineFileFormatters.ts`
- Create `components/shared/timeline/index.ts`
- Move the TimelineEvent* component files alongside (TimelineEventCard, TimelineEventComment, etc.)
- Update imports; delete original files

**Validation:** `npm run check`

---

## Phase 4: Screen-by-Screen Code Splitting

> **Order:** Start with the most independent/composable pieces and work up to the most coupled screens.
> **Suggested order:** Infrastructure > Overview > Reviews > More > Tasks (Tasks has the largest files, so do it last).

### Step 4.1 — Split `InfrastructureScreen.tsx` (~857 lines)

**Target files:**
- `screens/infrastructure/components/OutletList.tsx`
- `screens/infrastructure/components/OutletCard.tsx`
- `screens/infrastructure/components/OutletEditorSheet.tsx`
- `screens/infrastructure/components/OutletQrSheet.tsx`
- `screens/infrastructure/hooks/useOutletListState.ts`
- `screens/infrastructure/hooks/useOutletQrActions.ts`

**Process:**
1. Extract hooks first
2. Extract components (starting with leaf nodes like OutletCard, working up to OutletList)
3. Re-write `InfrastructureScreen.tsx` to compose new components/hooks
4. Delete extracted code from original file
5. `npm run check`

### Step 4.2 — Split `CreateOutletScreen.tsx` (~440 lines)

**Target files:**
- `screens/infrastructure/components/OutletForm.tsx`
- `screens/infrastructure/components/OutletPickers.tsx`
- `screens/infrastructure/hooks/useOutletFormState.ts`

**Process:** Same pattern — hooks first, then components, then rewire screen.

### Step 4.3 — Split `OutletTypesScreen.tsx` (~553 lines)

**Target files:**
- `screens/infrastructure/components/OutletTypeList.tsx`
- `screens/infrastructure/components/OutletTypeFormSheet.tsx`
- `screens/infrastructure/hooks/useOutletTypeCrud.ts`

### Step 4.4 — Split `OverviewScreen.tsx` (~1025 lines)

**Target files:**
- `screens/overview/components/OverviewTopPanel.tsx`
- `screens/overview/components/CsatFlipCard.tsx`
- `screens/overview/components/TrendlineChartCard.tsx`
- `screens/overview/components/QuickInsightsRow.tsx`
- `screens/overview/components/OutletFeedbackSection.tsx`
- `screens/overview/hooks/useOverviewDashboardModel.ts`

### Step 4.5 — Split `ReviewsScreen.tsx` (~1448 lines)

**Target files:**
- `screens/reviews/components/ReviewsAnalyticsSection.tsx`
- `screens/reviews/components/HeatmapSection.tsx`
- `screens/reviews/components/CriticalFeedbackSection.tsx`
- `screens/reviews/components/AllReviewsSection.tsx`
- `screens/reviews/components/ReviewsFilterSheet.tsx`
- `screens/reviews/components/OutletSelectorSheet.tsx`
- `screens/reviews/hooks/useReviewsFilterState.ts`

### Step 4.6 — Split `ReviewDetailScreen.tsx` (~1192 lines)

**Target files:**
- `screens/reviews/components/ReviewSummaryCard.tsx`
- `screens/reviews/components/ReviewResponsesSection.tsx`
- `screens/reviews/components/ComplaintResolutionForm.tsx`
- `screens/reviews/components/ResolutionDetailsSection.tsx`
- `screens/reviews/components/ReviewAttachmentBlock.tsx`
- `screens/reviews/hooks/useComplaintResolutionState.ts`

### Step 4.7 — Split the More screens

#### 4.7a — Split `ManagersScreen.tsx` (~648 lines)
- `screens/more/managers/components/ManagersList.tsx`
- `screens/more/managers/components/ManagerRow.tsx`
- `screens/more/managers/components/ManagerEditorSheet.tsx`
- `screens/more/managers/hooks/useManagersState.ts`

#### 4.7b — Split `FormBuilderScreen.tsx` (~740 lines)
- `screens/more/forms/components/FormBuilderList.tsx`
- `screens/more/forms/components/FormEditorSheet.tsx`
- `screens/more/forms/components/QuestionEditorCard.tsx`
- `screens/more/forms/components/QuestionTypePickerSheet.tsx`
- `screens/more/forms/hooks/useFormEditorState.ts`

#### 4.7c — Split `StudioScreen.tsx` (~1946 lines)
- `screens/more/studio/components/StudioCatalogueTab.tsx`
- `screens/more/studio/components/StudioAiOrdersTab.tsx`
- `screens/more/studio/components/StudioUploadsTab.tsx`
- `screens/more/studio/components/ProductFormSheet.tsx`
- `screens/more/studio/components/CategoryFormSheet.tsx`
- `screens/more/studio/components/CategoryManagerSheet.tsx`
- `screens/more/studio/components/AgeRangeFilterSheet.tsx`
- `screens/more/studio/hooks/useStudioState.ts` (if needed)

### Step 4.8 — Split `TasksScreen.tsx` (~2043 lines)

**Target files:**
- `screens/tasks/components/TaskBoardHeader.tsx`
- `screens/tasks/components/TaskFiltersToolbar.tsx`
- `screens/tasks/components/TaskFilterSheet.tsx`
- `screens/tasks/components/OpenTaskList.tsx`
- `screens/tasks/components/CompletedTasksAccordion.tsx`
- `screens/tasks/components/TaskAttachmentsSheet.tsx`
- `screens/tasks/hooks/useTasksBoardState.ts`
- `screens/tasks/hooks/useTaskCounters.ts`

### Step 4.9 — Split `CreateTaskScreen.tsx` (~1742 lines)

**Target files:**
- `screens/tasks/components/CreateTaskForm.tsx`
- `screens/tasks/components/TaskRecurrenceSection.tsx`
- `screens/tasks/components/TaskAttachmentComposer.tsx`
- `screens/tasks/components/TaskAttachmentPreviewList.tsx`
- `screens/tasks/components/TaskPickerSheets.tsx`
- `screens/tasks/hooks/useCreateTaskFormState.ts`
- `screens/tasks/hooks/useTaskAttachmentUploads.ts`

### Step 4.10 — Split `TaskDetailScreen.tsx` (~2365 lines) — **Largest file, do last**

**Target files:**
- `screens/tasks/components/TaskDetailHeader.tsx`
- `screens/tasks/components/TaskSummaryCard.tsx`
- `screens/tasks/components/TaskActivityTimeline.tsx`
- `screens/tasks/components/TaskSubmissionSheet.tsx`
- `screens/tasks/components/TaskEditSheet.tsx`
- `screens/tasks/components/TaskAttachmentViewer.tsx`
- `screens/tasks/hooks/useTaskDetailController.ts`
- `screens/tasks/hooks/useTaskAudioController.ts`

### Step 4.11 — Split `TaskCategoriesScreen.tsx` (~552 lines)

**Target files:**
- `screens/tasks/components/TaskCategoryList.tsx`
- `screens/tasks/components/TaskCategoryFormSheet.tsx`
- `screens/tasks/hooks/useTaskCategoryCrud.ts`

---

## Phase 5: Cleanup & Validation

### Step 5.1 — Audit remaining `src/components/` files

Review what's left in `src/components/` after all moves and splits. Identify:
- Components that should move to a feature-local directory
- Components that are truly shared and should stay
- Dead code that can be deleted

### Step 5.2 — Remove Android-only code paths

Search for Android-specific patterns and remove them:
- `Platform.OS === 'android'`
- `content://` URI handling
- Android-specific picker configurations

### Step 5.3 — Final validation

Run full validation suite:
```bash
npm run check
npm test
```

Fix any remaining issues.

### Step 5.4 — Update AGENTS.md

Update the project context file to reflect the new folder structure and file organization conventions.

---

## Execution Strategy

### Per-file extraction pattern

For each file being split, follow this sequence:

1. **Read** the entire source file to understand all exports, imports, and dependencies
2. **Create** the new files with extracted code
3. **Create** a barrel `index.ts` for the new module directory
4. **Update** the original file to re-export from the new modules (keeps imports working)
5. **Update** all import paths across the codebase to point to the new module
6. **Delete** the original file once no imports remain
7. **Validate** with `npm run check`

### Parallelisation opportunities

Steps that can be done in parallel (by separate branches/PRs):
- Phase 1 API endpoint splits (independent of each other)
- Phase 2 hook reorganisation (independent of each other and Phase 1)
- Phase 3 component moves (depends on Phase 2 for some imports)
- Phase 4 screen splits (each screen is independent, but all depend on Phases 1-3)
