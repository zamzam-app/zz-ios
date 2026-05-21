# 🧵 Task Thread — Frontend Migration Plan

> **Version:** 1.0  
> **Target:** React Native (Expo) iOS App  
> **Status:** Planning Phase — No Code Written Yet

---

## Table of Contents

1. [Frontend Architecture Analysis](#1-frontend-architecture-analysis)
2. [Backend/Frontend Integration Analysis](#2-backendfrontend-integration-analysis)
3. [Affected File Map](#3-affected-file-map)
4. [Migration Phases](#4-migration-phases)
5. [Component Architecture Plan](#5-component-architecture-plan)
6. [State Management Strategy](#6-state-management-strategy)
7. [Performance Optimization Plan](#7-performance-optimization-plan)
8. [Risk Analysis](#8-risk-analysis)
9. [Testing Strategy](#9-testing-strategy)
10. [Rollout Strategy](#10-rollout-strategy)

---

## 1. Frontend Architecture Analysis

### 1.1 Folder Structure (Current)

```
src/
├── api/
│   ├── client.ts              ← Axios instance + interceptors
│   ├── queryClient.ts         ← React Query client config
│   ├── storage.ts             ← AsyncStorage wrapper
│   └── endpoints/
│       ├── tasks.ts           ← Current task API calls (offset-paginated)
│       ├── reviews.ts
│       ├── products.ts
│       ├── outlets.ts
│       ├── users.ts
│       ├── forms.ts
│       ├── analytics.ts
│       ├── upload.ts          ← Cloudinary upload signature
│       ├── uploadQueue.ts     ← Upload queue manager
│       ├── taskSubmissionQueue.ts
│       ├── outletTypes.ts
│       └── mapListSafely.ts
├── hooks/
│   ├── useTasks.ts            ← Task queries + mutations (monolithic)
│   ├── useReviews.ts
│   ├── useProducts.ts
│   ├── useOutlets.ts
│   ├── useOutletTypes.ts
│   ├── useUsers.ts
│   ├── useForms.ts
│   └── useAnalytics.ts
├── store/
│   └── authStore.ts           ← Zustand auth state
├── navigation/
│   ├── AppNavigator.tsx
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   ├── TasksNavigator.tsx
│   ├── ReviewsNavigator.tsx
│   ├── InfrastructureNavigator.tsx
│   ├── MoreNavigator.tsx
│   └── reviewBadgeState.ts
├── screens/
│   ├── auth/
│   │   └── LoginScreen.tsx
│   ├── overview/
│   │   ├── OverviewScreen.tsx
│   │   └── reviewOverview.ts
│   ├── tasks/
│   │   ├── TasksScreen.tsx          ← Task list (FlatList)
│   │   ├── TaskDetailScreen.tsx     ← Current monolithic detail
│   │   ├── CreateTaskScreen.tsx
│   │   ├── TaskCategoriesScreen.tsx
│   │   ├── TaskBadgeRow.tsx
│   │   ├── taskBadges.ts
│   │   ├── taskDisplay.ts
│   │   └── taskAssignedTime.ts
│   ├── reviews/
│   │   ├── ReviewsScreen.tsx
│   │   └── ReviewDetailScreen.tsx
│   ├── infrastructure/
│   │   ├── InfrastructureScreen.tsx
│   │   ├── CreateOutletScreen.tsx
│   │   ├── OutletDetailScreen.tsx
│   │   ├── OutletTypesScreen.tsx
│   │   └── outletSearch.ts
│   └── more/
│       ├── MoreScreen.tsx
│       ├── SettingsScreen.tsx
│       ├── StudioScreen.tsx
│       ├── StudioDocumentDetailScreen.tsx
│       ├── ManagersScreen.tsx
│       └── FormBuilderScreen.tsx
├── components/
│   ├── ImagePickerButton.tsx
│   ├── StarRating.tsx
│   ├── StatusBadge.tsx
│   ├── DatePickerModal.tsx
│   ├── FilterDropdown.tsx
│   └── TaskQueueStatusBanner.tsx
├── constants/
│   ├── taskFilters.ts
│   └── reviewFilters.ts
├── theme/
│   └── theme.ts
├── config/
│   └── env.ts
└── utils/
    ├── errors.ts
    ├── reviewCritical.ts
    └── notifications.ts
```

### 1.2 Strengths

| Area | Assessment |
|------|------------|
| **React Query usage** | Well-established pattern across hooks with consistent cache invalidation via `useQueryClient` |
| **Separation of concerns** | API endpoints, hooks, screens, and components are cleanly separated |
| **Upload architecture** | `uploadQueue.ts` + Cloudinary signature flow is solid and reusable |
| **TypeScript** | Full TypeScript usage with proper types |
| **Auth state** | Zustand store for auth is lightweight and effective |
| **Error handling** | `errors.ts` provides centralized error formatting |

### 1.3 Architectural Problems / Technical Debt

| Issue | Severity | Description |
|-------|----------|-------------|
| **Monolithic task state** | 🔴 High | `TaskDetailScreen.tsx` loads a single task document as one blob — no thread/event separation |
| **Offset-based pagination** | 🔴 High | `GET /tasks` uses `page`/`limit` — the new backend uses cursor-based pagination |
| **No timeline concept** | 🔴 High | No existing concept of event timelines, activity logs, or threaded views |
| **No unread tracking** | 🔴 High | No integration with `TaskView`, `unreadMap`, or badge counts from new APIs |
| **No delegation UI** | 🟡 Medium | No concept of `activeOwner`, `activeDelegation`, delegate/reassign flows |
| **Attachment loading** | 🟡 Medium | Attachments are embedded in the task document — new system uses normalized `TaskAttachment` + cursor pagination |
| **FlatList without FlashList** | 🟡 Medium | Uses `FlatList` for task lists; could benefit from `FlashList` for performance |
| **No optimistic updates** | 🟡 Medium | Mutations refetch rather than optimistically updating the cache |
| **No skeleton/loading states** | 🟢 Low | Loading states are minimal (basic ActivityIndicator patterns) |
| **FilterDropdown tightly coupled** | 🟢 Low | `FilterDropdown.tsx` is generic but filter logic is baked into screens |

### 1.4 Areas That Conflict with New Backend

1. **`GET /tasks/:id` returns full document** — The new paradigm is `GET /tasks/:id/detail` returning `summary` + first timeline page
2. **No timeline endpoints consumed** — `GET /tasks/:id/timeline` (cursor-paginated events) doesn't exist in the frontend yet
3. **No view tracking** — `POST /tasks/:id/view` is not called anywhere
4. **No delegation endpoints** — `POST /tasks/:id/delegate`, `POST /tasks/:id/reassign`, `DELETE /tasks/:id/delegation` don't exist
5. **Attachment architecture mismatch** — Current attachments are embedded in the task doc; new system uses `TaskAttachment` collection + events
6. **No event type awareness** — The frontend doesn't render different cards for different `TaskEventType` values
7. **No cursor state management** — No hooks or utilities for cursor-based pagination

---

## 2. Backend/Frontend Integration Analysis

### 2.1 Which Current Flows Will Break

| Current Flow | Problem | Resolution |
|-------------|---------|------------|
| `GET /tasks/:id` → render detail page | Returns full task doc; new API returns `detail` with summary + timeline | Migrate to `GET /tasks/:id/detail` |
| Offset pagination in task list | Backend still supports `page`/`limit` on list, but timeline uses cursor | Keep offset for list; add cursor for timeline |
| No view call on task open | Badge counts will never reset | Add `POST /tasks/:id/view` on detail screen mount |
| Task update flow | `PATCH /tasks/:id` still works but doesn't create events natively | Keep existing; new event system is server-side concern |
| Attachment upload | Current flow uploads → gets URL → embeds in task; must now register via `POST /tasks/:id/attachments` | Add attachment registration step after upload |

### 2.2 Which APIs Become Obsolete

| Endpoint | Status | Replacement |
|----------|--------|-------------|
| `GET /tasks/:id` | Still works but superseded | `GET /tasks/:id/detail` is preferred |
| `PATCH /tasks/:id` | Still works for simple updates | No direct replacement — updates create events server-side |

All existing endpoints continue to function. The new endpoints are additive.

### 2.3 Which Screens Must Be Rewritten

| Screen | Action | Reason |
|--------|--------|--------|
| `TaskDetailScreen.tsx` | **Major refactor** | Must now render: task summary header + cursor-paginated timeline of events + delegation UI + view tracking + attachment gallery |
| `TasksScreen.tsx` | **Minor refactor** | Add unread badge indicators per task; integrate `unread-ids` or `unread-count` |
| `CreateTaskScreen.tsx` | **Minor refactor** | Add `assigneeIds` properly; backend auto-creates `CREATED` event |

### 2.4 Which Components Can Be Reused

| Component | Reusable? | Notes |
|-----------|-----------|-------|
| `StatusBadge.tsx` | ✅ Fully | Status rendering unchanged |
| `FilterDropdown.tsx` | ✅ Fully | Generic enough for timeline type filtering |
| `ImagePickerButton.tsx` | ✅ Fully | Upload flow remains the same |
| `DatePickerModal.tsx` | ✅ Fully | Date selection unchanged |
| `StarRating.tsx` | ✅ Fully | Review-specific, not affected |
| `TaskQueueStatusBanner.tsx` | ✅ Fully | Queue status display unchanged |
| `TaskBadgeRow.tsx` | ⚠️ Minor | May need unread count integration |
| `taskDisplay.ts` / `taskBadges.ts` | ⚠️ Minor | Utility functions mostly unaffected but may need unread awareness |

### 2.5 Where Optimistic Updates Are Needed

| Operation | Optimistic Update Needed | Rationale |
|-----------|------------------------|-----------|
| `POST /tasks/:id/view` | Yes | Marking as read should be instant — no loading state |
| `POST /tasks/:id/comment` | Yes | Comment should appear immediately in timeline |
| `POST /tasks/:id/attachments` | Yes | Attachment preview should show immediately |
| `POST /tasks/:id/delegate` | Yes | Delegation change should reflect instantly in UI |
| `POST /tasks/:id/reassign` | Yes | Owner change should reflect instantly |
| `DELETE /tasks/:id/attachments/:id` | Yes | Removal should be instant |

### 2.6 Where Unread Synchronization Is Needed

| Trigger | Action |
|---------|--------|
| Task detail screen mounts | `POST /tasks/:id/view` → reset local unread count |
| Task list renders | `GET /tasks/unread-ids` or `GET /tasks/unread-count` → show badges |
| Pull-to-refresh on task list | Refresh unread data |
| New event arrives (polling/push) | Increment unread count for affected tasks |
| Badge tab bar icon | `GET /tasks/unread-aggregated` → app icon badge |

### 2.7 Where Pagination Changes Are Required

| Screen | Current | New |
|--------|---------|-----|
| `TaskDetailScreen.tsx` (timeline) | N/A (no timeline) | Cursor-paginated `FlatList` with `loadMore` |
| `TasksScreen.tsx` (task list) | Offset pagination (`page`/`limit`) | Unchanged (backend still supports offset for list) |

### 2.8 Where Attachment Architecture Changes Are Required

| Change | Details |
|--------|---------|
| Upload flow | After Cloudinary upload, register via `POST /tasks/:id/attachments` |
| Attachment list | Replace embedded attachment rendering with cursor-paginated `GET /tasks/:id/attachments` |
| Attachment deletion | Switch from embedded removal to `DELETE /tasks/:id/attachments/:id` |
| Timeline attachment previews | Render `attachmentPreviews` on `ATTACHMENT_ADDED` events in timeline |

---

## 3. Affected File Map

### Directly Modified Files

```
src/api/endpoints/tasks.ts              ← Add all new API calls
src/hooks/useTasks.ts                   ← Add timeline, view, delegation, attachment hooks
src/screens/tasks/TaskDetailScreen.tsx  ← Major rewrite: timeline UI + delegation + view tracking
src/screens/tasks/TasksScreen.tsx       ← Add unread badge indicators
```

### New Files to Create

```
src/types/task.ts                       ← Shared types for TaskEvent, TaskDelegation, TaskView, etc.
src/api/endpoints/taskTimeline.ts       ← Timeline-specific API calls (optional, or keep in tasks.ts)
src/hooks/useTaskTimeline.ts            ← useInfiniteQuery for cursor-paginated timeline
src/hooks/useTaskView.ts                ← View tracking (mark as read)
src/hooks/useTaskDelegation.ts          ← Delegate/reassign mutations
src/hooks/useTaskAttachments.ts         ← Attachment mutations + cursor-paginated list
src/hooks/useTaskUnread.ts              ← Unread count queries + badge state
src/components/TimelineEventCard.tsx    ← Event renderer (dispatches by type)
src/components/TimelineEventComment.tsx ← COMMENTED event component
src/components/TimelineEventStatus.tsx  ← STATUS_CHANGED event component
src/components/TimelineEventAttachment.tsx ← ATTACHMENT_ADDED event component
src/components/TimelineEventDelegation.tsx ← REASSIGNED event component
src/components/TimelineEventCreated.tsx ← CREATED event component
src/components/TimelineEventGeneric.tsx ← Fallback event component
src/components/DelegationSheet.tsx      ← Bottom sheet for delegate/reassign
src/components/UnreadBadge.tsx          ← Badge component for unread count
src/components/TaskSummaryHeader.tsx    ← Task detail summary header (extracted from detail screen)
src/utils/pagination.ts                ← Cursor pagination helpers
```

### Files That May Need Minor Updates

```
src/navigation/TasksNavigator.tsx        ← [Optional] Add delegation tab
src/navigation/AppNavigator.tsx          ← [Optional] Update badge for unread aggregate
src/screens/tasks/TaskBadgeRow.tsx       ← Add unread indicator
src/screens/tasks/taskBadges.ts          ← Add unread badge utility
src/constants/taskFilters.ts             ← Add filter options for event types
src/components/TaskQueueStatusBanner.tsx ← May show delegation banner
```

### Unchanged Files

```
src/screens/tasks/CreateTaskScreen.tsx       ← Minor or no changes
src/screens/tasks/TaskCategoriesScreen.tsx   ← Unaffected
src/screens/tasks/taskDisplay.ts             ← Unaffected
src/screens/tasks/taskAssignedTime.ts         ← Unaffected
src/api/endpoints/upload.ts                  ← Unchanged
src/api/endpoints/uploadQueue.ts             ← Unchanged (may add registration step)
src/api/endpoints/taskSubmissionQueue.ts     ← Unchanged
src/components/ImagePickerButton.tsx         ← Unchanged
src/components/StatusBadge.tsx               ← Unchanged
src/components/DatePickerModal.tsx           ← Unchanged
src/components/FilterDropdown.tsx            ← Unchanged
src/components/StarRating.tsx                ← Unchanged
src/utils/errors.ts                          ← Unchanged
src/theme/theme.ts                           ← Unchanged
src/store/authStore.ts                       ← Unchanged
```

---

## 4. Migration Phases

### Phase 1 🟢 — Types & API Layer

**Goal:** Introduce all new TypeScript types and API endpoint functions without changing any screens.

**Files to create:**
- `src/types/task.ts` — All new types: `TaskEvent`, `TaskEventType`, `SerializedTimelineEvent`, `TaskDetailResponse`, `TaskView`, `TaskDelegation`, `TaskAttachment`, `AttachmentType`, `DelegationSummary`, `PaginatedResponse`, cursor types

**Files to modify:**
- `src/api/endpoints/tasks.ts` — Add new API functions:
  - `getTaskDetail(id)` → `GET /tasks/:id/detail`
  - `getTimeline(id, cursor?, limit?, types?)` → `GET /tasks/:id/timeline`
  - `getEventTypeCounts(id)` → `GET /tasks/:id/events/type-counts`
  - `markTaskViewed(id)` → `POST /tasks/:id/view`
  - `markMultipleTasksViewed(ids)` → `POST /tasks/view-all`
  - `getUnreadCount()` → `GET /tasks/unread-count`
  - `getUnreadAggregated()` → `GET /tasks/unread-aggregated`
  - `getUnreadIds()` → `GET /tasks/unread-ids`
  - `delegateTask(id, to, note)` → `POST /tasks/:id/delegate`
  - `reassignTask(id, to, reason)` → `POST /tasks/:id/reassign`
  - `clearDelegation(id)` → `DELETE /tasks/:id/delegation`
  - `getDelegationHistory(id)` → `GET /tasks/:id/delegations`
  - `getDelegatedToMe()` → `GET /tasks/delegated-to-me`
  - `getMyDelegations()` → `GET /tasks/my-delegations`
  - `addAttachments(id, files)` → `POST /tasks/:id/attachments`
  - `removeAttachment(taskId, attachmentId)` → `DELETE /tasks/:id/attachments/:attachmentId`
  - `getAttachments(id, cursor?, limit?, type?)` → `GET /tasks/:id/attachments`

**Dependencies:** None
**Risk:** 🟢 Low — pure additive changes
**Testing:** TypeScript compilation check
**Estimated effort:** 1-2 hours

---

### Phase 2 🟢 — Cursor Pagination Utilities

**Goal:** Build reusable cursor pagination helpers for the timeline.

**Files to create:**
- `src/utils/pagination.ts` — 
  - `encodeCursor(obj)` / `decodeCursor(str)` — base64 cursor encode/decode
  - `useCursorInfiniteQuery(queryKey, fetcher)` — wrapper around `useInfiniteQuery` with cursor support
  - `cursorFn(nextPage)` — `getNextPageParam` factory
  - Type aliases for paginated responses

**Dependencies:** Phase 1
**Risk:** 🟢 Low
**Testing:** Unit tests for cursor encode/decode
**Estimated effort:** 30 min

---

### Phase 3 🟢 — Timeline Hooks

**Goal:** Build all new React Query hooks for timeline, view tracking, delegation, and attachments.

**Files to create:**
- `src/hooks/useTaskTimeline.ts` — 
  - `useTaskTimeline(taskId, filters?)` → `useInfiniteQuery` wrapping `getTimeline`
  - `useEventTypeCounts(taskId)` → `useQuery` wrapping `getEventTypeCounts`
- `src/hooks/useTaskView.ts` — 
  - `useMarkTaskViewed()` → `useMutation` wrapping `markTaskViewed`
  - `useMarkMultipleViewed()` → `useMutation` wrapping `markMultipleViewed`
  - `useUnreadCount()` → `useQuery` wrapping `getUnreadCount`
  - `useUnreadAggregated()` → `useQuery` wrapping `getUnreadAggregated`
  - `useUnreadIds()` → `useQuery` wrapping `getUnreadIds`
- `src/hooks/useTaskDelegation.ts` — 
  - `useDelegateTask()` → `useMutation`
  - `useReassignTask()` → `useMutation`
  - `useClearDelegation()` → `useMutation`
  - `useDelegationHistory(taskId)` → `useQuery`
  - `useDelegatedToMe()` → `useQuery`
  - `useMyDelegations()` → `useQuery`
- `src/hooks/useTaskAttachments.ts` — 
  - `useAddAttachments()` → `useMutation`
  - `useRemoveAttachment()` → `useMutation`
  - `useTaskAttachments(taskId, cursor?, type?)` → `useInfiniteQuery`

**Dependencies:** Phase 1, Phase 2
**Risk:** 🟢 Low — hooks only, no UI
**Testing:** Manual query testing in dev
**Estimated effort:** 2-3 hours

---

### Phase 4 🟡 — Event Type Renderers

**Goal:** Build the timeline event card components that render different UI for each `TaskEventType`.

**Files to create:**
- `src/components/TimelineEventCard.tsx` — **Root dispatcher component**
  - Receives `SerializedTimelineEvent`
  - Dispatches to specific renderer based on `event.type`
  - Renders consistent wrapper: icon, actor avatar/name, timestamp, attachment previews
- `src/components/TimelineEventCreated.tsx` — "Created task"
  - Icon: `add_task` / `task_alt`
  - Shows description snippet
- `src/components/TimelineEventComment.tsx` — "Commented"
  - Icon: `comment` / `chat_bubble`
  - Shows comment text
  - Renders inline attachment previews if present
- `src/components/TimelineEventStatus.tsx` — "Status changed"
  - Icon: `sync_alt` / `update`
  - Shows "from → to" status transition
- `src/components/TimelineEventAttachment.tsx` — "Attachment added"
  - Icon: `attach_file`
  - Shows attachment thumbnail/preview + file name + size
- `src/components/TimelineEventDelegation.tsx` — "Delegated/Reassigned"
  - Icon: `person_add` / `swap_horiz`
  - Shows "delegated from X to Y" or "reassigned to Z"
  - Delegation summary with names + avatars
- `src/components/TimelineEventGeneric.tsx` — Fallback for unrecognized types
  - Icon: `event` (generic)
  - Shows event type label + `JSON.stringify` of data

**Design reference:** Google Stitch vertical timeline with:
- Left-aligned timeline rail (2px width, surface-container-highest color)
- Circular icon nodes on the rail (24px, filled icons, colored by event type)
- Content card to the right of the node
- Timestamps in secondary text
- Hover/press states for interactive events (comments, attachments)

**Dependencies:** Phase 1
**Risk:** 🟡 Medium — UI complexity, many event permutations
**Testing:** Storybook or manual rendering of each event type
**Estimated effort:** 3-4 hours

---

### Phase 5 🔴 — Task Detail Screen Rewrite

**Goal:** Rewrite `TaskDetailScreen.tsx` as a thread/timeline-based view.

**Files to modify:**
- `src/screens/tasks/TaskDetailScreen.tsx` — **Major rewrite**

**New architecture:**
```
TaskDetailScreen
├── TaskSummaryHeader (new component)
│   ├── Priority badge + Category badge
│   ├── Title (description)
│   ├── Due date/time
│   ├── Active owner + delegation info
│   ├── Thread stats (event count, attachment count)
│   └── Description section
├── Attachments gallery section
│   └── Grid of attachment thumbnails (extracted from timeline or separate query)
├── Activity Timeline (FlatList)
│   ├── TimelineEventCard (dispatches by type)
│   │   ├── TimelineEventCreated
│   │   ├── TimelineEventComment
│   │   ├── TimelineEventStatus
│   │   ├── TimelineEventAttachment
│   │   ├── TimelineEventDelegation
│   │   └── TimelineEventGeneric
│   ├── Load more (onEndReached → fetchNextPage)
│   └── Loading indicator (ListFooterComponent)
├── Filter chips for event types
│   └── FilterDropdown or horizontal chip scroll
└── Bottom Action Bar
    ├── Comment input
    ├── Attach button (opens image picker)
    ├── Delegate button (opens DelegationSheet)
    └── Status change button
```

**Key behaviors:**
- On mount: `useTaskDetail(id)` (summary + first timeline page)
- On mount: `useMarkTaskViewed(id)` (mark as read)
- Infinite scroll timeline via `useTaskTimeline(id, filters)`
- Pull-to-refresh resets timeline
- Submit comment → optimistic update → mutation
- Upload attachment → optimistic preview → Cloudinary upload → register via API
- Delegate/reassign → open bottom sheet → mutation

**Dependencies:** Phase 1, 2, 3, 4
**Risk:** 🔴 High — largest single change, UI regression risk
**Testing:** Manual testing of every event type, pagination, delegation flow
**Estimated effort:** 6-8 hours

---

### Phase 6 🟡 — Delegation UI

**Goal:** Build the delegation/reassignment bottom sheet and associated UI components.

**Files to create:**
- `src/components/DelegationSheet.tsx` — Bottom sheet component
  - Two modes: **Delegate** (temporary hand-off) and **Reassign** (permanent transfer)
  - User picker (searchable list of managers/admins)
  - Optional note/reason text input
  - Confirm button → calls mutation
  - Loading state during mutation
  - Error display

- `src/components/DelegationBanner.tsx` — Inline banner showing current delegation
  - Shows "Delegated to X by Y" with timestamp
  - "Revoke delegation" action button (calls `clearDelegation`)
  - Appears below task summary header when `activeDelegation` is present

**Files to modify:**
- `TaskDetailScreen.tsx` — Wire delegation actions from bottom bar to `DelegationSheet`

**Dependencies:** Phase 3, Phase 5
**Risk:** 🟡 Medium — bottom sheet UX, user search performance
**Testing:** Manual delegation flow end-to-end
**Estimated effort:** 3-4 hours

---

### Phase 7 🟡 — Unread Tracking & Badge Sync

**Goal:** Integrate unread badge counts throughout the app.

**Files to create:**
- `src/components/UnreadBadge.tsx` — 
  - Small red badge circle with count
  - Animated entry/exit
  - Configurable position (top-right corner)

**Files to modify:**
- `src/screens/tasks/TasksScreen.tsx` — 
  - On mount / focus: `useUnreadIds()` to get tasks with unread events
  - Pass unread state to `TaskBadgeRow`
  - Show `UnreadBadge` on task cards with unread > 0
  - Pull-to-refresh syncs unread data
- `src/screens/tasks/TaskBadgeRow.tsx` — 
  - Accept `unreadCount` prop
  - Render `UnreadBadge` when count > 0
- `src/screens/tasks/taskBadges.ts` — 
  - Add `unreadCount` to badge utility functions
- `src/screens/tasks/TaskDetailScreen.tsx` — 
  - On mount: auto-fire `markTaskViewed` mutation
  - Optimistically clear local unread count
- `src/navigation/AppNavigator.tsx` — 
  - Fetch `unreadAggregated` on app focus
  - Set iOS app icon badge number

**Cache invalidation:**
- After `markTaskViewed`: invalidate `unreadCount`, `unreadIds`, task list queries
- After new event (from push/socket): re-fetch unread counts

**Dependencies:** Phase 1, 3, 5
**Risk:** 🟡 Medium — badge inconsistency if sync is broken
**Testing:** Force unread counts, verify badge resets on view
**Estimated effort:** 3-4 hours

---

### Phase 8 🟡 — Optimistic Updates & Cache Invalidation

**Goal:** Add optimistic updates to all task mutations for instant UI feedback.

**Optimistic update strategy for each mutation:**

| Mutation | Optimistic Cache Update |
|----------|------------------------|
| `markTaskViewed` | Set `unreadCount = 0` for task in list cache; remove from unread IDs |
| `addAttachments` | Add attachment preview to timeline cache immediately; rollback on error |
| `removeAttachment` | Remove from attachment list + timeline cache; rollback on error |
| `delegateTask` | Update `activeOwner` + `activeDelegation` in task detail cache; add REASSIGNED event to timeline |
| `reassignTask` | Update `activeOwner` in task detail cache; clear delegation; add REASSIGNED event |
| `clearDelegation` | Restore owner, clear delegation sub-document; add REASSIGNED event |
| `addComment` | Add COMMENTED event to timeline cache; rollback on error |

**Cache invalidation rules:**
```
After any task mutation:
  → invalidateQueries(['task', id])          // Detail cache
  → invalidateQueries(['taskTimeline', id])  // Timeline cache (refetch latest)
  → invalidateQueries(['tasks'])             // Task list cache

After view mutation:
  → invalidateQueries(['unreadCount'])
  → invalidateQueries(['unreadIds'])
  → invalidateQueries(['tasks'])             // Badge state in list

After delegation mutation:
  → invalidateQueries(['delegations'])
  → invalidateQueries(['delegatedToMe'])
```

**Files to modify:**
- All hooks in Phase 3 — Add `onMutate`, `onError`, `onSettled` handlers

**Dependencies:** Phase 3, 5, 7
**Risk:** 🟡 Medium — incorrect optimistic state can cause confusing UI
**Testing:** Mock API failures and verify rollback behavior
**Estimated effort:** 3-4 hours

---

### Phase 9 🟢 — Performance Optimization

**Goal:** Optimize timeline FlatList rendering and prevent unnecessary re-renders.

**Specific optimizations:**

1. **FlashList migration** — Replace `FlatList` with `@shopify/flash-list` for the timeline
   - `estimatedItemSize={80}` for timeline events
   - `keyExtractor` using `event._id`
   - `getItemType` for different cell layouts

2. **Memoization** —
   - `React.memo` on all `TimelineEvent*` components
   - `useMemo` for filtered event data
   - `useCallback` for all event handlers (load more, filter change)

3. **Image optimization** —
   - Lazy-load attachment previews with `FastImage` or `expo-image`
   - Blurhash placeholders for images
   - Progressive loading for large attachments

4. **List optimization** —
   - `windowSize={5}` for timeline (only render 5 screens worth)
   - `maxToRenderPerBatch={10}`
   - `removeClippedSubviews={true}` for long timelines
   - `optimizationInterval={0}` for FlashList

5. **Timeline filter memory** —
   - Don't keep all events in memory when type filter is active
   - Discard non-matching pages from cache when filter changes

**Files to modify:**
- `TaskDetailScreen.tsx` — Replace FlatList with FlashList, add memo configs
- All `TimelineEvent*` components — Add `React.memo`

**Dependencies:** Phase 4, 5
**Risk:** 🟢 Low
**Testing:** Timeline scrolling performance with 500+ events
**Estimated effort:** 2-3 hours

---

### Phase 10 🟢 — Cleanup & Polish

**Goal:** Remove dead code, polish edge cases, add loading/skeleton states.

**Tasks:**

1. **Skeleton/loading states** —
   - `TaskSummaryHeader` skeleton (pulsing rectangles)
   - Timeline skeleton (3-4 pulsing event card placeholders)
   - Attachment gallery skeleton

2. **Empty states** —
   - Empty timeline state ("No activity yet")
   - Empty attachment state ("No attachments")
   - Filtered timeline empty state ("No events of this type")

3. **Error states** —
   - Timeline load error with retry button
   - Mutation error toast/snackbar
   - Network offline banner

4. **Dead code removal** —
   - Remove old embedded attachment rendering from `TaskDetailScreen`
   - Remove any deprecated API functions

5. **Edge cases** —
   - Task with 0 events (newly created)
   - Task with 1000+ events (pagination boundary)
   - Rapid delegation/reassign cycles
   - Attachment upload failure mid-flow
   - Concurrent view mutations (multiple tabs)

**Dependencies:** Phase 5, 6, 7, 8
**Risk:** 🟢 Low
**Testing:** Comprehensive edge case testing
**Estimated effort:** 3-4 hours

---

## 5. Component Architecture Plan

### 5.1 Timeline Component Tree

```
TimelineEventCard (dispatcher)
├── TimelineEventCreated
├── TimelineEventComment
├── TimelineEventStatus
├── TimelineEventAttachment
├── TimelineEventDelegation
└── TimelineEventGeneric
```

**Common props (all event components):**
```typescript
interface TimelineEventProps {
  event: SerializedTimelineEvent;
  onAttachmentPress?: (attachment: AttachmentPreview) => void;
  onUserPress?: (userId: string) => void;
}
```

**`TimelineEventCard` dispatching logic:**
```typescript
function TimelineEventCard({ event, ...props }: TimelineEventProps) {
  switch (event.type) {
    case TaskEventType.CREATED:
      return <TimelineEventCreated event={event} {...props} />;
    case TaskEventType.COMMENTED:
      return <TimelineEventComment event={event} {...props} />;
    case TaskEventType.STATUS_CHANGED:
    case TaskEventType.COMPLETED:
    case TaskEventType.REOPENED:
      return <TimelineEventStatus event={event} {...props} />;
    case TaskEventType.ATTACHMENT_ADDED:
    case TaskEventType.ATTACHMENT_REMOVED:
      return <TimelineEventAttachment event={event} {...props} />;
    case TaskEventType.REASSIGNED:
      return <TimelineEventDelegation event={event} {...props} />;
    default:
      return <TimelineEventGeneric event={event} {...props} />;
  }
}
```

**Each event card renders:**
```
[Timeline Rail] [Icon Node] [Content Card]
                      │
                      ├── Actor name + "action text"
                      ├── Event timestamp (relative: "2h ago")
                      ├── Event-specific content
                      └── Attachment previews (if any)
```

### 5.2 Task Detail Component Tree

```
TaskDetailScreen
├── <FlashList>
│   ├── ListHeaderComponent
│   │   ├── TaskSummaryHeader
│   │   │   ├── StatusBadge (status)
│   │   │   ├── Priority badge
│   │   │   ├── Category badge
│   │   │   ├── Title (description)
│   │   │   ├── Due date/time row
│   │   │   ├── Active owner + DelegationBanner
│   │   │   ├── Thread stats row
│   │   │   └── Description expandable section
│   │   └── Attachment gallery section
│   │       └── Grid of attachment thumbnails
│   ├── TimelineEventCard (repeated for each event)
│   └── ListFooterComponent
│       ├── Loading spinner (when fetching next page)
│       └── "No more events" (when !hasMore)
├── Filter chips (horizontal scroll, above timeline)
└── Bottom Action Bar (fixed)
    ├── Comment input + send button
    ├── Attach button (ImagePickerButton)
    ├── Delegate button (opens DelegationSheet)
    └── Status/Complete button
```

### 5.3 Delegation Component Tree

```
BottomSheet (DelegationSheet)
├── Mode toggle: Delegate | Reassign
├── UserSearchInput
├── UserResultsList (filtered FlatList)
│   └── UserRow (avatar + name + role)
├── Note/Reason TextInput (optional)
├── Confirm Button (primary, calls mutation)
└── Error display

DelegationBanner (inline)
├── "Delegated to X by Y" text
├── Timestamp
└── "Revoke" text button
```

### 5.4 Attachment Strategy

**Upload flow:**
```
User selects image → ImagePickerButton
  → Show optimistic preview in timeline
  → uploadQueue.enqueue(file)
    → GET /upload/signature
    → POST to Cloudinary (signed)
    → Get Cloudinary URL
  → POST /tasks/:id/attachments { files: [{ url, type, size, mimeType }] }
  → Server creates TaskAttachment + emits ATTACHMENT_ADDED event
  → Receive back the registered attachment with _id
```

**Attachment rendering:**
- In timeline: `attachmentPreviews` on `ATTACHMENT_ADDED` events — show as inline thumbnails
- In gallery section: Cursor-paginated `GET /tasks/:id/attachments` — show in grid
- Attachment types determine rendering:
  - `IMAGE` → Thumbnail + tap to full-screen
  - `VIDEO` → Thumbnail with play icon
  - `AUDIO` → Audio player UI
  - `FILE` / `DOCUMENT` → File icon + name + size + download link

### 5.5 Loading/Skeleton Architecture

| Component | Loading State |
|-----------|---------------|
| `TaskSummaryHeader` | 4-5 pulsing rectangles (title, badges, dates, description) |
| Timeline events | 3-4 pulsing event card skeletons |
| Attachment gallery | 6 grid squares with pulsing overlay |
| `DelegationSheet` | Spinner in confirm button |

Use `react-native-reanimated` for smooth skeleton pulse animations.

### 5.6 Pagination Architecture

**Timeline pagination flow:**
```
1. Initial load: useTaskTimeline(taskId, { limit: 20 })
   → Fetches first page via GET /tasks/:id/timeline
   → Appends to events state

2. Scroll to bottom: onEndReached
   → if (hasNextPage && !isFetchingNextPage) fetchNextPage()
   → Fetches next page with cursor from last response
   → Appends to events state

3. Filter change: types={[COMMENTED, STATUS_CHANGED]}
   → Resets pages, refetches from beginning
   → Cursor: null (first page with new filter)

4. Pull-to-refresh: onRefresh
   → Refetch all pages from scratch
   → Reset cursor
```

**State structure:**
```typescript
interface TimelineState {
  pages: SerializedTimelineEvent[][];
  pageParams: (string | null)[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isRefetching: boolean;
}
```

---

## 6. State Management Strategy

### 6.1 Timeline State

**Primary store:** React Query cache via `useInfiniteQuery`

**Key structure:**
```typescript
// Query key hierarchy
['taskTimeline', taskId]                          // Full timeline
['taskTimeline', taskId, { types: [COMMENTED] }]  // Filtered timeline

// Each page response:
{
  data: SerializedTimelineEvent[],
  nextCursor: string | null,
  hasMore: boolean
}
```

**No global state needed** for timeline data — React Query handles caching, deduplication, and garbage collection.

### 6.2 Unread State

**Primary store:** React Query (refetched on focus/interval)

**Optimistic local state:**
```typescript
// In TasksScreen or a lightweight context:
const [localUnreadMap, setLocalUnreadMap] = useState<Record<string, number>>({});

// On mount: fetch from API → populate map
// On markTaskViewed: remove taskId from map
// On new event (push): increment map[taskId]
```

**Persistence:** Not persisted — refetched on app launch and focus.

### 6.3 Pagination State

**Managed by** `useInfiniteQuery` internally. The `getNextPageParam` function handles cursor extraction:

```typescript
getNextPageParam: (lastPage) => {
  return lastPage.hasMore ? lastPage.nextCursor : undefined;
}
```

### 6.4 Optimistic Updates

**Pattern for all mutations:**
```typescript
const mutation = useMutation({
  mutationFn: (data) => api.updateTask(data),
  
  onMutate: async (data) => {
    // 1. Cancel outgoing queries
    await queryClient.cancelQueries(['task', data.id]);
    
    // 2. Snapshot previous state
    const previous = queryClient.getQueryData(['task', data.id]);
    
    // 3. Optimistically update cache
    queryClient.setQueryData(['task', data.id], (old) => ({
      ...old,
      ...data.changes,
    }));
    
    // 4. Return snapshot for rollback
    return { previous };
  },
  
  onError: (err, data, context) => {
    // 5. Rollback on error
    queryClient.setQueryData(['task', data.id], context?.previous);
    showErrorToast('Update failed');
  },
  
  onSettled: () => {
    // 6. Refetch to ensure consistency
    queryClient.invalidateQueries(['task']);
  },
});
```

### 6.5 Upload State

**Upload queue** (`src/api/endpoints/uploadQueue.ts`) already manages:
- File queue
- Upload progress
- Retry logic
- Error handling

**New integration:** After successful Cloudinary upload, dispatch `addAttachments` mutation. The mutation handles:
- Optimistic addition to timeline
- Server registration
- Error rollback

### 6.6 Cache Invalidation Strategy

| Trigger | Invalidated Keys |
|---------|-----------------|
| Task created | `['tasks']`, `['taskOverview']` |
| Task updated | `['tasks']`, `['task', id]`, `['taskTimeline', id]` |
| Task status changed | `['tasks']`, `['task', id]`, `['taskTimeline', id]`, `['taskOverview']` |
| Task viewed | `['unreadCount']`, `['unreadIds']`, `['tasks']` |
| Comment added | `['taskTimeline', id]`, `['task', id]` (threadStats) |
| Attachment added | `['taskTimeline', id]`, `['taskAttachments', id]`, `['task', id]` (threadStats) |
| Attachment removed | `['taskTimeline', id]`, `['taskAttachments', id]`, `['task', id]` |
| Delegation changed | `['task', id]`, `['taskTimeline', id]`, `['delegations']`, `['delegatedToMe']` |
| Reassign | `['task', id]`, `['taskTimeline', id]`, `['tasks']` (owner filter) |

### 6.7 Query Synchronization Strategy

**On app focus** (`AppState.addEventListener('change')`):
- Refetch `unreadAggregated` for badge
- Refetch `unreadIds` for task list badges

**On task list screen focus** (`useFocusEffect`):
- Refetch task list (with `staleTime: 0` or `refetchOnWindowFocus`)
- Refetch unread counts

**On task detail screen mount:**
- Fetch detail + first timeline page
- Fire `markTaskViewed` (fire-and-forget, no loading UI)
- Subscribe to `useFocusEffect` for refetch on return from background

---

## 7. Performance Optimization Plan

### 7.1 FlatList/FlashList Optimization

| Technique | Implementation |
|-----------|---------------|
| **Use FlashList** | Replace `FlatList` with `@shopify/flash-list` for timeline |
| **estimatedItemSize** | `80` for timeline events (fairly uniform height) |
| **Item memoization** | `React.memo` on all `TimelineEvent*` components |
| **keyExtractor** | `event._id` — stable, unique |
| **getItemType** | Return different type strings per event type for cell recycling |
| **windowSize** | `5` (render ~5 screens worth of events) |
| **maxToRenderPerBatch** | `10` events per batch |
| **removeClippedSubviews** | `true` for long timelines |
| **ListHeaderComponent** | Use for summary header + attachment gallery (not rendered as separate list) |

### 7.2 Rerender Prevention

- **Props memoization:** All callback props wrapped in `useCallback`
- **Data memoization:** Filtered/transformed event data wrapped in `useMemo`
- **Context splitting:** If delegation state is needed across components, use separate contexts for timeline data vs action handlers
- **Avoid inline functions in render:** All event handlers defined outside render or with `useCallback`

### 7.3 Attachment Rendering Optimization

- **expo-image** (or `FastImage`): For image attachments — provides caching, progressive loading, and memory management
- **Image dimensions:** Store `width`/`height` in attachment metadata for proper aspect ratio without `onLoad`
- **Thumbnail generation:** Use Cloudinary transformation params (`w_200,h_200,c_fill`) for list thumbnails
- **Lazy loading:** Only render visible attachment previews (FlashList virtualization handles this)
- **Memory cleanup:** Remove full-resolution images from memory when scrolling away

### 7.4 Pagination Performance

- **Page size:** 20 events per page (API default) — 10 batch render per load
- **Pre-fetching:** Start fetching next page when 5 items from bottom (not at exact end)
- **Page cache:** Keep last 10 pages in cache; older pages can be garbage collected
- **Filter changes:** Reset entire cache when type filter changes (no stale data)

### 7.5 Image Loading

**Priority strategy:**
```
1. Immediate: Avatar images (small, critical for identity)
2. High: First 3 attachment thumbnails (visible without scroll)
3. Medium: Remaining visible attachment thumbnails
4. Low: Off-screen attachment previews in timeline
```

### 7.6 Memory Usage

- **Event data:** Each `SerializedTimelineEvent` is ~200-500 bytes. 500 events = ~250KB. Acceptable.
- **Attachment previews:** Each preview URL string is ~100 bytes. 100 previews = ~10KB. Acceptable.
- **Image memory:** `expo-image` manages its own memory cache. Limit in-memory cache to 20MB.
- **List virtualization:** FlashList only renders visible items + window margin. Memory scales with viewport, not data size.

### 7.7 React Native iOS Performance Concerns

| Concern | Mitigation |
|---------|------------|
| **JSC memory pressure** | Keep minimal state in JS; let React Query manage cache with `gcTime` |
| **Slow navigation transitions** | Use `React.startTransition` for timeline navigation |
| **Keyboard avoidance** | Use `KeyboardAvoidingView` with proper `behavior="padding"` |
| **Heavy timelines (1000+ events)** | Virtualization handles this; test with 2000 events |
| **Image-heavy screens** | `expo-image` with disk caching; limit concurrent loads |
| **Animation jank** | Use `react-native-reanimated` for delegation sheet and transitions |

---

## 8. Risk Analysis

### 8.1 High Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| **Task detail UI regression** | Users can't view tasks | Medium | Phase 5 is the highest-risk phase. Build behind a feature flag. Test thoroughly before merging. |
| **Badge inconsistency** | Wrong unread counts shown | Medium | Use `unreadIds` (binary) rather than counts for list; count displayed on detail. Implement polling fallback. |
| **Timeline pagination bugs** | Events missing or duplicated | Medium | Write unit tests for cursor encode/decode. Use React Query's built-in pagination. Test with 100+ events. |
| **Optimistic update rollback failures** | Stale UI state | Low | Always invalidate queries after mutation settles. Use snapshot-based rollback. |
| **Attachment upload race conditions** | Duplicate or missing attachments | Low | Upload queue handles serialization. Optimistic previews are removed on error. |

### 8.2 Medium Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| **Delegation permission errors** | Users can't delegate | Low | Show clear error messages; validate permissions client-side before API call. |
| **Type filter performance** | Slow timeline with filters | Low | Cache filtered results separately; reset pagination on filter change. |
| **Concurrent view mutations** | Race condition on unread count | Low | Mutation is idempotent; last-write-wins is acceptable. |
| **Network offline during delegation** | Delegation state mismatch | Low | Disable delegation actions when offline; show offline banner. |
| **Memory with many attachments** | App crash on low-memory devices | Low | Use Cloudinary thumbnails; limit concurrent image loads. |

### 8.3 Low Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| **Skeleton flash** | Brief layout shift | Low | Use consistent skeleton dimensions matching real content. |
| **Empty state confusion** | Users think timeline is broken | Low | Add empty state illustration + text + CTA to add first comment. |
| **Scroll position loss on filter change** | User loses place | Low | Not a priority for v1; can add scroll position restoration later. |

### 8.4 UI Regression Risks

| Area | Risk | Mitigation |
|------|------|------------|
| Task list (TasksScreen) | Unread badges cause layout shift | Use absolute positioned badge; fixed size regardless of count |
| Task detail header | Summary section changes appearance | Maintain existing layout structure; add new elements (delegation, stats) below existing fields |
| Navigation badges | Tab bar badge doesn't update | Use React Query's `refetchInterval` or focus-based refetch |
| Status badges | Same component, unchanged | No risk |

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Module | Tests |
|--------|-------|
| `src/utils/pagination.ts` | `encodeCursor` / `decodeCursor` round-trip; invalid cursor handling |
| `src/types/task.ts` | Type validation (compile-time only) |
| `src/components/TimelineEventCard.tsx` | Renders correct sub-component for each event type |
| `src/hooks/useTaskTimeline.ts` | Mock API; verify pages are concatenated correctly |
| `src/hooks/useTaskView.ts` | Mock mutation; verify optimistic update + rollback |

### 9.2 Integration Tests

| Flow | Test |
|------|------|
| Load task detail | Verify summary + first timeline page render |
| Load more timeline | Scroll to bottom → verify next page appended |
| Filter timeline by type | Tap filter chip → verify only matching events shown |
| Mark as read | Open task detail → verify badge cleared on task list |
| Delegate task | Open delegation sheet → select user → verify delegation event appears |
| Add comment | Type comment → send → verify comment appears in timeline |
| Upload attachment | Select image → verify optimistic preview → verify upload completes |

### 9.3 End-to-End Tests

| Flow | Manual Test Steps |
|------|-------------------|
| Full task lifecycle | Create task → view detail → add comment → upload attachment → change status → complete |
| Delegation flow | Open task → delegate → verify timeline event → verify owner change → revoke |
| Pagination | Create 50 events → scroll timeline → verify all loadable |
| Unread sync | Create new event on different device → verify badge appears → open task → verify badge clears |
| Error recovery | Trigger API error → verify rollback → verify retry works |

### 9.4 Performance Tests

| Test | Metric | Target |
|------|--------|--------|
| Timeline scroll with 500 events | FPS | > 55 fps |
| Timeline initial load time | Time-to-render | < 500ms (with skeleton) |
| Image attachment grid (20 images) | Memory | < 50MB additional |
| Delegation sheet open | Animation | 60fps |

### 9.5 Testing Tools

- **Unit tests:** Jest + React Native Testing Library
- **API mocking:** MSW (Mock Service Worker) or manual mock functions
- **E2E:** Detox or manual testing on physical device
- **Performance:** React Native Profiler + Flipper

---

## 10. Rollout Strategy

### 10.1 Phase Ordering & Dependencies

```
Phase 1 (Types & API)       ──────────────────┐
Phase 2 (Pagination Utils)  ──────────────────┤
Phase 3 (Hooks)             ──────────────────┤────── Phase 5 (Task Detail Rewrite)
Phase 4 (Event Renderers)   ──────────────────┘         │
                                                        ├── Phase 6 (Delegation UI)
                                                        ├── Phase 7 (Unread Tracking)
                                                        └── Phase 8 (Optimistic Updates)
                                                                  │
                                                                  └── Phase 9 (Performance)
                                                                          │
                                                                          └── Phase 10 (Cleanup)
```

### 10.2 Feature Flag Strategy

All new UI behind a single feature flag:

```typescript
// config/features.ts
export const FEATURES = {
  THREADED_TASKS: __DEV__ || true, // Enable for dev; flip for production
};
```

In `TaskDetailScreen.tsx`:
```typescript
if (FEATURES.THREADED_TASKS) {
  return <ThreadedTaskDetailView taskId={id} />;
} else {
  return <LegacyTaskDetailView taskId={id} />;
}
```

### 10.3 Staged Rollout

| Stage | Audience | Duration | Verification |
|-------|----------|----------|-------------|
| **Dev** | Developers | Throughout | All tests pass |
| **QA** | QA team | 1 week | Manual test all flows |
| **Beta** | Internal managers | 2 weeks | Real usage + feedback |
| **Production** | All users | Gradual (10% → 50% → 100%) | Monitor crash rate + API errors |

### 10.4 Rollback Plan

1. **Toggle feature flag** `FEATURES.THREADED_TASKS = false` → instant rollback to legacy view
2. **Keep legacy code path** until new system is stable (at least 2 weeks in production)
3. **Monitor API errors** for new endpoints (404s, 500s) — could indicate bugs in the new backend controllers

### 10.5 Deployment Checklist

Per phase:
- [ ] TypeScript compiles without errors
- [ ] All unit tests pass
- [ ] Manual test of new functionality
- [ ] Verify no regression in existing functionality
- [ ] Performance profile acceptable
- [ ] Error states handled gracefully
- [ ] Feature flag properly configured

Phase 5 (Task Detail Rewrite) gate:
- [ ] All 6 event types render correctly
- [ ] Timeline pagination works (empty → single page → multi-page)
- [ ] Pull-to-refresh works
- [ ] Comment submission works
- [ ] Attachment upload works end-to-end
- [ ] Delegation/reassign flow works
- [ ] View tracking fires on mount
- [ ] Offline state shows appropriate UI
- [ ] Performance > 55fps with 200 events

---

## Appendix A: Data Flow Diagrams

### A.1 Task Detail Load Flow

```
User taps task in list
        │
        ▼
TaskDetailScreen mounts
        │
        ├── useTaskDetail(id) ──┬── GET /tasks/:id/detail
        │                       │      ├── summary (task metadata)
        │                       │      └── timeline (first page)
        │                       │
        │                       └── Cache: ['task', id]
        │
        ├── useMarkTaskViewed(id) ── POST /tasks/:id/view
        │                              └── Invalidate: unreadCount, unreadIds
        │
        └── Render:
             ├── TaskSummaryHeader (from summary)
             ├── Attachment gallery (from attachments endpoint)
             └── FlashList (from timeline data)
```

### A.2 Timeline Infinite Scroll Flow

```
User scrolls near bottom
        │
        ▼
onEndReached called
        │
        ├── hasNextPage? ── No ──► Do nothing
        │       │
        │      Yes
        │       │
        │       ▼
        │   isFetchingNextPage? ── Yes ──► Do nothing
        │       │
        │      No
        │       │
        │       ▼
        │   fetchNextPage()
        │       │
        │       ▼
        │   GET /tasks/:id/timeline?cursor=eyJz...
        │       │
        │       ▼
        │   Append events to list
        │   Update nextCursor
        │
        ▼
Render additional TimelineEventCards
```

### A.3 Delegate Flow

```
User taps "Delegate" button
        │
        ▼
Open DelegationSheet (BottomSheet)
        │
        ├── Select user from searchable list
        ├── (Optional) Enter note
        │
        ▼
Tap "Delegate" confirm
        │
        ▼
useDelegateTask mutation fires
        │
        ├── onMutate: Optimistic update
        │   ├── task.activeOwner → delegatedTo
        │   ├── task.activeDelegation → { delegatedTo, delegatedBy, delegatedAt }
        │   └── Add REASSIGNED event to timeline cache
        │
        ├── mutationFn: POST /tasks/:id/delegate
        │
        ├── onSuccess:
        │   ├── Server response → replace optimistic state
        │   └── Show success toast
        │
        ├── onError:
        │   ├── Rollback optimistic changes
        │   └── Show error toast
        │
        └── onSettled:
            └── Invalidate: task, taskTimeline, delegations
```

---

## Appendix B: TypeScript Type Definitions

These should be created in `src/types/task.ts`:

```typescript
// === Enums ===

export enum TaskEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  COMPLETED = 'COMPLETED',
  REOPENED = 'REOPENED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  DUE_DATE_CHANGED = 'DUE_DATE_CHANGED',
  ASSIGNED = 'ASSIGNED',
  REASSIGNED = 'REASSIGNED',
  COMMENTED = 'COMMENTED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED',
  SUBMITTED = 'SUBMITTED',
  RECURRENCE_CREATED = 'RECURRENCE_CREATED',
}

export enum AttachmentType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  DOCUMENT = 'DOCUMENT',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TaskStatus {
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
}

// === Core Data Types ===

export interface Actor {
  _id: string;
  name: string;
  avatar?: string;
}

export interface AttachmentPreview {
  _id: string;
  type: AttachmentType;
  url: string;
}

export interface DelegationSummary {
  delegatedTo: Actor;
  delegatedBy: Actor;
}

export interface SerializedTimelineEvent {
  _id: string;
  type: TaskEventType;
  data: Record<string, unknown>;
  createdBy: Actor;
  sortKey: string;
  createdAt: string;
  attachmentPreviews?: AttachmentPreview[];
  delegationSummary?: DelegationSummary;
}

export interface TaskSummary {
  _id: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  activeOwner?: Actor;
  activeDelegation?: {
    delegatedTo: Actor;
    delegatedBy: Actor;
    delegatedAt: string;
  } | null;
  threadStats: {
    eventCount: number;
    attachmentCount: number;
    lastEventAt: string;
  };
  lastEvent?: {
    type: TaskEventType;
    by: string;
    at: string;
  };
  unreadCount: number;
  createdAt: string;
  assigneeIds: string[];
  createdBy: string;
  outletId: string | null;
  taskCategoryId: string;
}

export interface TaskDetailTimelineResponse {
  summary: TaskSummary;
  timeline: PaginatedResponse<SerializedTimelineEvent>;
}

// === Pagination Types ===

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface TimelineCursor {
  sortKey: string;
}

// === View Types ===

export interface UnreadTaskCount {
  taskId: string;
  unreadCount: number;
}

export interface AggregatedUnread {
  totalUnread: number;
  taskCount: number;
}

// === Delegation Types ===

export interface CreateDelegationDto {
  delegatedTo: string;
  note?: string;
}

export interface CreateReassignmentDto {
  newOwnerId: string;
  reason?: string;
}

export interface TaskDelegationRecord {
  _id: string;
  taskId: string;
  delegatedBy: string;
  delegatedTo: string;
  note?: string;
  createdAt: string;
  delegatedByName?: string;
  delegatedToName?: string;
}

export interface ActiveDelegation {
  taskId: string;
  delegatedBy: string;
  delegatedAt: string;
}

// === Attachment Types ===

export interface TaskAttachment {
  _id: string;
  type: AttachmentType;
  url: string;
  uploadedBy: Actor;
  size?: number;
  mimeType?: string;
  createdAt: string;
}

export interface AddAttachmentDto {
  files: Array<{
    url: string;
    type: AttachmentType;
    size?: number;
    mimeType?: string;
  }>;
}

export interface DelegationEventResponse {
  event: SerializedTimelineEvent;
  task: TaskSummary;
}
```

---

*End of migration plan. Begin implementation with Phase 1 when ready.*
