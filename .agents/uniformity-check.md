# API Call + Data Storage Uniformity Check

Date: 2026-05-25

Scope: repo-wide spot-check of (1) how API calls are made and (2) where/How returned data is stored/consumed after the call (React Query cache, Zustand, AsyncStorage queues, local component state).

## Plan

Goal: full end-to-end standardization (backend contract + frontend endpoints + React Query usage).

### Phase 1 — Backend Contract (requires changes in `zz-backend`)

1. Choose and enforce a single response shape convention:
   - Lists: `{ data: T[]; meta: {...} }`
   - Single entity: `{ data: T }`
   - Mutations: `{ data: T }` (return the created/updated entity)
2. Standardize identifiers and relations:
   - Prefer `id` (string) everywhere (avoid mixed `_id` / `id`)
   - For nested refs, pick one consistent shape (either populated objects with `id/name/...` or plain ids) per endpoint family and document it.
3. Align error payloads (optional but recommended): consistent `{ message, code, details? }` so frontend can render errors uniformly.

### Phase 2 — Frontend Endpoint Layer (no backend changes once Phase 1 is merged)

1. Make every endpoint function return **domain data** (mapped models), never `AxiosResponse`.
2. Remove “envelope guessing” (`Array.isArray(r.data)` vs `{ data }`) once backend is uniform.
3. Reduce direct `client` usage in feature code by routing through endpoint modules (auth + push token can either be formalized as endpoints or remain explicitly whitelisted exceptions).

### Phase 3 — React Query Usage + Cache Policy (frontend-only)

1. Standardize query keys (constants/helpers) so lists/details/mutations can’t drift.
2. Pick a single post-CRUD policy and apply everywhere:
   - Always invalidate affected lists, and
   - When mutations return the updated entity, always `setQueryData` for that entity’s detail cache (and optionally patch list caches).
3. Document the rules in a short conventions note so new code follows the same standard.

## Executive Summary

Overall, API access is *mostly uniform*:

- HTTP is centralized through `src/api/client.ts` (Axios instance + auth interceptor/refresh).
- “Domain endpoints” live under `src/api/endpoints/**` and generally **return mapped domain models** (normalized `id`, defensive handling of `{data: ...}` envelopes, etc.).
- UI/server-state consumption is largely via **React Query hooks** under `src/hooks/**` (and a few feature-local hooks under `src/screens/**/hooks`), which store results in the Query Cache.

Notable non-uniform areas (details + file references below):

1. **Endpoint return shapes are not fully consistent** (some endpoints return `AxiosResponse`, others return `response.data`, others return mapped models).
2. **Post-mutation cache updates are inconsistent** (some mutations invalidate only; some also `setQueryData`).
3. **A small number of “direct client” calls exist** outside endpoints/hooks (push-token sync; auth store).
4. **Background queues** (uploads + task submission) store state in `AsyncStorage` rather than React Query (intentional, but distinct).

## What’s Uniform (Good Baseline)

### 1) Single HTTP client + auth token flow

- `src/api/client.ts` attaches the access token on every request and performs a one-time refresh+retry on `401`.
- Auth tokens are stored in SecureStore (`src/api/storage.ts`) and used by the client interceptor.

### 2) Endpoints typically return “ready-to-use” models

Many endpoint modules map backend shapes to app shapes (e.g., `_id`/`id` normalization, envelope unwrapping, and type guards):

- Tasks CRUD mapping + `{data/meta}` handling: `src/api/endpoints/tasks/taskCrudApi.ts#L14`
- Reviews mapping + envelope unwrapping: `src/api/endpoints/reviews.ts` (see `unwrapRawReview` + `mapReview`)
- Outlets mapping for related fields (manager refs, outletType variants): `src/api/endpoints/outlets.ts`
- Shared defensive list-mapping helper: `src/api/endpoints/mapListSafely.ts`

### 3) React Query is the default “storage” for server state

Across domains, components typically read/write server state via hooks that cache by `queryKey`:

- Outlets: `src/hooks/infrastructure/useOutlets.ts#L5`
- Reviews: `src/hooks/reviews/useReviews.ts#L5`
- Tasks: `src/hooks/tasks/useTasks.ts#L11`
- Analytics: `src/hooks/analytics/useAnalytics.ts#L7`

## Non-Uniform Findings (API Return Shapes)

### A) `analyticsApi` mixes “return AxiosResponse” and “return data”

In `src/api/endpoints/analytics.ts`, most methods return the raw Axios promise (callers must do `.then(r => r.data)`), but one method returns `response.data` directly:

- Returns `AxiosResponse`: `src/api/endpoints/analytics.ts#L121`
- Returns `.data` directly: `src/api/endpoints/analytics.ts#L145`

The corresponding hook works around this by manually unwrapping `.data` for most calls:

- `src/hooks/analytics/useAnalytics.ts#L7`

Impact:

- Call sites must remember which analytics method returns `AxiosResponse` vs already-unwrapped data.
- It’s easy for a new hook/component to forget `.data` and accidentally treat `AxiosResponse` as the actual payload.

### B) `usersApi.changePassword` returns a raw Axios promise (no unwrapping)

- `src/api/endpoints/users.ts#L67` returns mapped models for `list/create/update`
- `src/api/endpoints/users.ts#L84` returns `client.post(...)` directly for `changePassword`

Impact:

- Most callers elsewhere expect endpoint methods to return domain data (or `void`), but this returns an Axios response object.
- It is “safe” if call sites ignore return value, but it is inconsistent with the rest of `usersApi`.

### C) Deletes are sometimes “fire-and-forget”, sometimes strongly typed

Example:

- `tasksApi.delete` ultimately returns `client.delete(...)` without unwrapping (and without typing a response body): `src/api/endpoints/tasks/taskCrudApi.ts#L64`

Impact:

- Usually OK since UI doesn’t need delete response bodies, but it increases inconsistency across endpoints (some return models, others return Axios responses).

## Non-Uniform Findings (How Data Is Stored After Calls)

### A) Mutation success behavior differs by feature

Some hooks *only invalidate* queries:

- Tasks update/status: `src/hooks/tasks/useTasks.ts#L93` (invalidate a set of keys, but does not `setQueryData`)
- Studio create/update/delete: `src/hooks/studio/useProducts.ts` (invalidate only)

Some hooks also *write through* updated objects into cache:

- Outlets update: `src/hooks/infrastructure/useOutlets.ts#L27` uses `qc.setQueryData(['outlet', updated.id], updated)`
- Reviews resolve complaint: `src/hooks/reviews/useReviews.ts#L42` uses `qc.setQueryData(['review', ...], updated)`

Impact:

- UX/data freshness differences between domains (some detail screens update immediately; others wait for refetch).
- Higher chance of temporarily stale detail views when only invalidation is used.

### B) Background queues store state outside React Query (AsyncStorage)

Uploads:

- Queue persists jobs in AsyncStorage: `src/api/endpoints/uploads/uploadQueueStore.ts`
- UI component directly enqueues jobs: `src/components/shared/ImagePickerButton.tsx#L57`

Task submission queue:

- Queue storage: `src/api/endpoints/tasks/taskSubmissionQueueStore.ts`
- Processor invalidates React Query after completing jobs: `src/api/endpoints/tasks/taskSubmissionProcessor.ts`

Impact:

- Different “storage + lifecycle” model than typical server-state hooks (intentional for resiliency/background retries).
- Components interacting with queues don’t use React Query keys; they use queue APIs + event listeners.

## Direct API Client Usage Outside Endpoints/Hooks

Two direct usages of `src/api/client.ts` exist outside the endpoints layer:

1. Push token sync:
   - `src/utils/notifications.ts#L1` uses `apiClient.patch('/users/push-token', ...)` directly (`src/utils/notifications.ts#L38`).
2. Auth store:
   - `src/store/authStore.ts` calls `/auth/login` and `/auth/profile` directly (rather than via a dedicated `authApi` module).

Impact:

- Small, manageable exceptions, but they bypass the usual “endpoint mapping + uniform return types” pattern.

## Recommendations (Concrete + Low-Risk)

1. **Standardize endpoint return types**
   - Preferred pattern: endpoints return domain data (mapped model / primitives) rather than `AxiosResponse`.
   - Bring `analyticsApi.*` in line by returning `.then(r => r.data)` for all methods (or by wrapping in `async` and returning `r.data`).
   - Do the same for `usersApi.changePassword` (return `void` or `r.data` explicitly), and consider typing delete methods to return `void`.

2. **Decide on a consistent cache update strategy for mutations**
   - Option A: “invalidate-only” everywhere (simple, but can feel stale).
   - Option B: “write-through detail caches when you have the updated entity” (common React Query practice).
   - Today the repo mixes both; standardizing would make behavior more predictable.

3. **Optionally introduce a small convention doc**
   - A short note (even 10–15 lines) under `.agents/` or `HANDOVER.md` defining:
     - endpoints return data not `AxiosResponse`
     - hooks own React Query keys
     - when to `invalidateQueries` vs `setQueryData`

## Appendix: Key References

- `src/api/client.ts` (Axios client + token refresh)
- `src/api/storage.ts` (SecureStore token storage)
- `src/api/endpoints/analytics.ts#L121` (mixed return shapes)
- `src/hooks/analytics/useAnalytics.ts#L7` (workaround `.data` unwrapping)
- `src/api/endpoints/users.ts#L84` (`changePassword` returns raw Axios promise)
- `src/hooks/infrastructure/useOutlets.ts#L27` (mutation writes through cache)
- `src/hooks/reviews/useReviews.ts#L42` (mutation writes through cache)
- `src/components/shared/ImagePickerButton.tsx#L57` (queue-based uploads)
- `src/utils/notifications.ts#L38` (direct API call outside endpoints)
