# Expo + React Native Repository Review

## Scope
This review covers project structure, architecture, code organization, consistency, maintainability, scalability, and coding style across the current Expo React Native iOS app.

---

## Executive Summary

### Strong foundations
- Clear layered baseline exists: `api` + `hooks` + `screens` + `components` + `navigation` + `theme`.
- React Query is used widely and correctly for server state.
- Domain mapping from inconsistent backend shapes is handled intentionally in endpoint mappers.
- Theme tokens are centralized in `src/theme/theme.ts` and used broadly.
- Navigation is strongly typed at stack/tab level.

### Highest-impact issues
1. **Very large screen files (high complexity, low scalability)**
   - `src/screens/tasks/TaskDetailScreen.tsx` (2046 lines)
   - `src/screens/tasks/TasksScreen.tsx` (1616 lines)
   - `src/screens/tasks/CreateTaskScreen.tsx` (1612 lines)
   - `src/screens/more/StudioScreen.tsx` (1569 lines)
   - `src/screens/reviews/ReviewsScreen.tsx` (1419 lines)
2. **Type safety erosion in critical flows (`any`, casts, weakly typed payloads)** across task detail/timeline, upload, queue, and navigation edges.
3. **Business logic mixed into UI screens** (sorting, filtering, mapping, media handling, queue decisions, formatting) causing duplication and hard-to-test behavior.
4. **Inconsistent API return conventions** (`axios response` vs `.data`) and query-key patterns increase maintenance overhead.
5. **Temporary/debug code in production paths** (`console.log`, broad `console.warn`, polling/side effects inside UI components).

---

## Prioritized Improvement Plan

## P0 (Immediate, high impact)

### 1) Break down monolithic screens into feature modules
- Current issue:
  - Task, review, and studio screens combine data fetching, derived selectors, mutation orchestration, media handling, and rendering in a single file.
- Why it matters:
  - Slow onboarding, fragile edits, merge conflicts, and accidental regressions.
- Concrete targets:
  - `src/screens/tasks/TaskDetailScreen.tsx`
  - `src/screens/tasks/TasksScreen.tsx`
  - `src/screens/tasks/CreateTaskScreen.tsx`
  - `src/screens/reviews/ReviewsScreen.tsx`
  - `src/screens/more/StudioScreen.tsx`
- Actionable pattern:
  - Split each feature into:
    - `screens/<feature>/<Feature>Screen.tsx` (composition only)
    - `screens/<feature>/components/*` (presentation components)
    - `screens/<feature>/hooks/*` (feature-specific orchestration)
    - `screens/<feature>/selectors/*` (pure derived data)
    - `screens/<feature>/utils/*` (formatters/mappers)

### 2) Remove unsafe `any` and reduce forced casts
- Current issue examples:
  - `src/screens/tasks/TaskDetailScreen.tsx` uses many `(source as any)` and `audioPlayerStatus?: any`.
  - `src/api/endpoints/taskSubmissionQueue.ts` uses `payload: any`, `attachments: any`, `(error as any)`.
  - `src/navigation/RootNavigator.tsx` uses `pendingNotificationData` as `any`.
  - `src/screens/more/MoreScreen.tsx` uses `navigation.navigate(item.screen as any)`.
- Why it matters:
  - Hidden runtime errors and weak IDE/static guarantees in core flows.
- Actionable pattern:
  - Define explicit DTO types (`NotificationPayload`, `QueuedTaskPayload`, `TaskDetailViewModel`).
  - Introduce type guards for backend shapes.
  - Replace `as any` icon casts with typed icon unions.

### 3) Extract shared task/review utility logic to avoid duplication
- Current duplicated patterns:
  - `buildAttachmentName` in both `TasksScreen` and `TaskDetailScreen`.
  - `formatDate` logic repeated across task screens.
  - repeated relative time and complaint filtering logic in review/task screens.
- Why it matters:
  - Bug fixes must be repeated; behavior diverges over time.
- Actionable pattern:
  - Create `src/features/tasks/utils/` and `src/features/reviews/utils/`.
  - Centralize date/attachment formatting and filter predicates.

### 4) Separate queue/business services from UI lifecycle
- Current issue:
  - `taskSubmissionQueue.ts` is global mutable state + `setInterval` at module scope.
- Why it matters:
  - Hard to reason about lifecycle, duplicate processing risk, and poor testability.
- Actionable pattern:
  - Convert queue into explicit service module/class with:
    - `start()`, `stop()`, `enqueue()`, `subscribe()`
    - typed job payload unions for create/update
    - deterministic retry policy module

---

## P1 (Near-term)

### 5) Standardize API endpoint conventions
- Current inconsistency:
  - Some endpoint methods return axios responses (analytics methods), others return mapped data objects.
  - hooks then mix `queryFn: api()` vs `queryFn: api().then(r => r.data)`.
- Why it matters:
  - Cognitive overhead and accidental misuse.
- Actionable pattern:
  - Make all endpoint methods return final typed domain data only.
  - Keep transport details inside endpoint files.

### 6) Standardize query keys and invalidation strategy
- Strength:
  - Query keys are generally organized and invalidations are present.
- Issues:
  - key naming style varies (`['users','all']`, `['taskDetail', id]`, `['unread', ...]`, `['tasks-infinite', query]`).
  - repeated invalidation blocks in many hooks.
- Actionable pattern:
  - Add query key factory (e.g., `taskKeys`, `reviewKeys`, `userKeys`).
  - Centralize invalidation helpers per domain mutation.

### 7) Improve state placement boundaries
- Strength:
  - Zustand auth store is focused.
- Issues:
  - Local screen state includes heavy business state in giant components.
  - queue modules and notification navigation logic span UI and service responsibilities.
- Actionable pattern:
  - Keep UI-local state in screens; move business workflow state into feature hooks/services.
  - Keep auth store small; avoid adding unrelated global state there.

### 8) Navigation consistency and type safety hardening
- Strength:
  - Param list typing is present across stacks.
- Issues:
  - nested navigation from notifications depends on `any` data payload.
  - some screens hide headers entirely; back behaviors and title consistency vary.
- Actionable pattern:
  - define `NotificationRouteIntent` union and decoder.
  - avoid `as any` navigate calls in menu-driven routes.
  - centralize header defaults in one shared navigator options object.

### 9) Error handling and observability
- Strength:
  - `getApiErrorMessage` utility gives useful fallback extraction.
- Issues:
  - noisy logs in production paths (`RootNavigator`, `TaskDetailScreen`), and generic `catch {}` in multiple places.
- Actionable pattern:
  - Replace `console.*` with a lightweight logger abstraction (`debug/info/warn/error`) that is env-aware.
  - Ensure user-facing failures are surfaced consistently (toast/banner/alert policy).

---

## P2 (Medium-term)

### 10) Component architecture and reusability
- Strength:
  - Shared components exist for timeline/events, badges, filters, date picker, etc.
- Gaps:
  - many feature-specific card UIs remain embedded in screens (open/completed task cards, review cards).
  - component file placement is global (`src/components`) even for tightly feature-coupled components.
- Actionable pattern:
  - keep generic UI in `src/components`.
  - move domain-specific components under feature folders (`src/features/tasks/components/*`).

### 11) Styling system consistency
- Strength:
  - theme tokens are centralized and used often.
- Gaps:
  - literal colors still appear in screens (`#ecfdf5`, `#fef2f2`, `#F59E0B`, etc.).
  - style patterns repeated manually for cards/buttons/chips.
- Actionable pattern:
  - enforce “token-only” colors except deliberate one-off visual cases.
  - introduce reusable style primitives (Card, SectionHeader, FilterChip).

### 12) Performance improvements
- Strength:
  - FlashList is used in at least one heavy screen.
- Risks:
  - very large render functions and frequent re-computations inside screens.
  - hook usage in tab icons (`useReviews({limit:100})` in `AppNavigator`) can refetch/compute from navigation layer.
- Actionable pattern:
  - move expensive count derivations to dedicated memoized hooks/selectors.
  - avoid data fetching directly inside tab icon render components; use cached aggregated query.
  - extract heavy list item components and wrap with `React.memo` where appropriate.

### 13) Config and environment management
- Strength:
  - `src/config/env.ts` centralizes env reads and trimming.
- Gaps:
  - defaults can hide missing env configuration at runtime.
- Actionable pattern:
  - add startup env validation for required vars in non-dev builds.
  - document all env vars in `.env.example` and README sync.

### 14) Expo / RN best-practice alignment
- Positive:
  - Gesture handler root, safe area provider, React Query provider are correctly set.
  - Expo modules integrated for notifications, media, document picker.
- Improvement opportunities:
  - notification handling logic in navigator is doing multiple concerns (restore auth + route + pending queue).
  - managed app should avoid long-lived module-level intervals unless lifecycle controlled.

---

## Detailed Category Findings

## Folder structure and architecture

### What is good
- Top-level `src` organization is intuitive.
- Domain endpoint files (`src/api/endpoints/*`) are mostly consistent.

### What to improve
- Current architecture is “flat-by-technical-layer”, but feature complexity now requires **feature-oriented grouping**.
- Suggested evolution:
  - `src/features/tasks/*`
  - `src/features/reviews/*`
  - `src/features/infrastructure/*`
  - keep `src/core` for `api`, `theme`, `navigation`, `store`, `config`, shared `utils`.

## Component organization and reusability
- Timeline components are well-factored.
- Task/review card blocks in giant screens should become reusable feature components.

## State management patterns
- Server state: good use of React Query.
- Client state: auth in Zustand is appropriate.
- Improvement: move heavy derived state and orchestration out of screen components into custom hooks/selectors.

## TypeScript and type safety
- `strict: true` is enabled (strong baseline).
- Type safety is weakened by frequent `any` and shape coercion.
- Introduce dedicated type guards and discriminated unions for notification payloads, queue jobs, and submission sources.

## Styling consistency and UI patterns
- Theme file is strong.
- Enforce token usage to avoid hex spread in screens.
- Consider semantic tokens for review severities and status backgrounds.

## Naming conventions
- Mostly clear naming (`useX`, `XApi`, `XNavigator`).
- Some mixed conventions (`TasksList` route name vs `TasksScreen` component) are acceptable but can be standardized.

## Hook abstraction opportunities
- Strong opportunity in Tasks/Reviews screens for:
  - `useTaskFilters()`
  - `useTaskAttachmentActions()`
  - `useTaskAudioPlayback()`
  - `useReviewFilters()`
  - `useReviewDerivedMetrics()`

## API/service layer structure
- Good: mapping functions handle inconsistent backend payloads defensively.
- Improvement: unify API method return contract and extract repeated envelope-unwrapping helpers.

## Performance concerns
- Large files indicate unnecessary rerender scope.
- Data fetching in tab icon components may cause unnecessary work.
- Inline derived computations should be memoized/extracted.

## Code duplication
- Repeated formatters and attachment helpers across task screens.
- Repeated query invalidation blocks in hooks.

## Readability and maintainability
- Giant files and mixed responsibilities are the biggest maintainability risk.
- Break into composable units before adding major new features.

## Error handling patterns
- Existing helper is useful.
- Add consistent user-facing error surface and structured logging.

## Navigation structure
- Multi-navigator structure is clear.
- Harden typed navigation for dynamic menu/notification routes.

## Configuration and environment management
- Central env access exists.
- Add required-var validation and fail-fast behavior for critical URLs.

## Scalability concerns
- Current shape will slow rapidly as features grow; merge conflicts likely in giant screens.
- Feature module split is the most important scalability investment.

## Dead code / unnecessary complexity
- Debug logs in production paths are candidates for cleanup.
- Some fallback legacy fetch patterns may now be removable after backend stabilization.

## Separation of concerns
- Primary gap: screen components own transport, business rules, and rendering simultaneously.
- Move toward: endpoint mappers -> feature hooks/selectors -> presentation components.

---

## Suggested Refactor Roadmap

### Phase 1 (1-2 weeks)
- Split `TaskDetailScreen` into feature modules.
- Remove `any` in task queue and notification routing.
- Centralize shared task formatters/helpers.

### Phase 2 (1-2 weeks)
- Split `TasksScreen` and `ReviewsScreen` into orchestration + presentational components.
- Add query key factories and shared invalidation helpers.
- Standardize endpoint return shape conventions.

### Phase 3 (ongoing)
- Incrementally migrate to `src/features/*` structure.
- Introduce logging abstraction and env validation.
- Tighten linting rules (`no-explicit-any`, `no-console` with approved exceptions).

---

## Key Strengths to Preserve
- Defensive backend data mapping (`mapListSafely`, domain mappers).
- React Query-centric data flow.
- Centralized theming tokens.
- Typed navigation param lists.
- Lean Zustand auth store.

