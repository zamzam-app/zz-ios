# Uniformity Plan

This document outlines the step-by-step plan to standardize API calls and data storage across the `zz-ios` repository, based on the findings in `uniformity-check.md`.

## Phase 1: Standardize Endpoint Return Types

**Goal:** Ensure all endpoints return mapped domain data rather than raw `AxiosResponse` objects.

1. **Update `analyticsApi`**
   - **File:** `src/api/endpoints/analytics.ts`
   - **Action:** Modify methods that currently return `AxiosResponse` to return unwrapped data (e.g., appending `.then(r => r.data)`).
   - **Update Call Sites:** Update `src/hooks/analytics/useAnalytics.ts` to expect unwrapped data and remove any manual `.data` unwrapping.

2. **Update `usersApi.changePassword`**
   - **File:** `src/api/endpoints/users.ts`
   - **Action:** Modify `changePassword` to return unwrapped data or `void` explicitly instead of returning the raw `client.post(...)` promise.
   - **Update Call Sites:** Ensure any callers of `changePassword` handle the updated return type correctly.

3. **Standardize Delete Operations**
   - **File:** `src/api/endpoints/tasks/taskCrudApi.ts` (and any other files with `.delete` methods).
   - **Action:** Explicitly type delete methods to return `void` or the unwrapped response, rather than the raw Axios promise, ensuring consistency with other CRUD operations.

## Phase 2: Address Direct API Client Usage

**Goal:** Route direct `src/api/client.ts` usages through dedicated endpoint modules to maintain architectural consistency.

1. **Refactor Push Token Sync**
   - **File:** `src/utils/notifications.ts`
   - **Action:** Move the `/users/push-token` API call into `src/api/endpoints/users.ts` (e.g., as `updatePushToken`).
   - **Action:** Update `src/utils/notifications.ts` to call this new endpoint method instead of using the raw `apiClient` directly.

2. **Refactor Auth Store**
   - **File:** `src/store/authStore.ts`
   - **Action:** Create a dedicated `src/api/endpoints/authApi.ts` module (if it doesn't exist) or add methods to an appropriate existing module.
   - **Action:** Move `/auth/login` and `/auth/profile` calls into `authApi`.
   - **Action:** Update `authStore.ts` to use these mapped `authApi` methods.

## Phase 3: Unify Mutation Cache Strategies

**Goal:** Apply a consistent strategy for updating the React Query cache after a successful mutation.

1. **Establish the Standard**
   - Adopt the "write-through detail caches when you have the updated entity + invalidate lists" strategy as the repo-wide standard. This provides the best UX by immediately updating detail views while ensuring list freshness.

2. **Apply to Tasks**
   - **File:** `src/hooks/tasks/useTasks.ts`
   - **Action:** Update mutations (e.g., update/status changes) to use `queryClient.setQueryData` for the specific task entity to instantly reflect changes, in addition to the existing `invalidateQueries` for lists.

3. **Apply to Studio**
   - **File:** `src/hooks/studio/useProducts.ts`
   - **Action:** Update create/update mutations to use `queryClient.setQueryData` for the specific product entity, in addition to invalidating the lists.

## Phase 4: Documentation

**Goal:** Prevent future drift by documenting the new standards.

1. **Update Conventions Documentation**
   - **File:** `.agents/conventions.md` or append to `HANDOVER.md`.
   - **Action:** Add a clear, concise section defining the established rules:
     - Endpoints **must** return domain data, never `AxiosResponse`.
     - Hooks own and manage React Query keys.
     - Mutations that return updated entities **must** use `setQueryData` for detail caches, alongside `invalidateQueries` for related lists.
