# ZamZam iOS — Code Audit Report

**Date:** 2026-04-17

**Scope:** `src/api/`, `src/hooks/`, `src/screens/`, `src/navigation/`, `src/store/`, `src/components/`
**Stack:** React Native + TypeScript, React Navigation, TanStack Query, Zustand, Axios, Expo

---

## Executive Summary

The ZamZam iOS app is well-structured and follows reasonable patterns throughout. The API layer has a solid token-refresh mechanism and the component hierarchy is clean. However, three classes of issue deserve immediate attention: a security weakness around refresh-token storage (plain AsyncStorage instead of SecureStore), a logic bug in the complaint-resolution guard that allows re-resolving already-settled complaints, and the Cloudinary upload function having no timeout or network-error retry, meaning a slow upload will silently hang the UI indefinitely. Across the board, none of the analytics or task-list queries set a `staleTime`, so five API calls fire every time the user returns to the Overview tab. Accessibility is the weakest area: star ratings, priority dots, and delete buttons throughout have no labels readable by screen readers.

---

## 1. Bugs

### B-1 — `canResolve` allows re-resolving already-settled complaints
**Severity:** High
**File:** `src/screens/reviews/ReviewDetailScreen.tsx:75–77`

```ts
const canResolve =
  review?.isComplaint &&
  (review.complaintStatus === 'pending' || !review.complaintStatus || review.overallRating < 2.5);
```

The third OR branch (`review.overallRating < 2.5`) is evaluated regardless of `complaintStatus`. A complaint that has already been marked `resolved` or `dismissed` and happens to have a low rating will still show the resolve/dismiss action buttons, allowing it to be "resolved" a second time.

**Fix:** Remove the third branch or guard it with an explicit status check:
```ts
const canResolve =
  review?.isComplaint &&
  (review.complaintStatus === 'pending' || !review.complaintStatus);
```

---

### B-2 — Token clear on any refresh error logs out on transient network failures
**Severity:** High
**File:** `src/api/client.ts:68–71`

```ts
} catch {
  await tokenStorage.clear();
  pendingRequests = [];
  return Promise.reject(error);
}
```

The catch block around the refresh call clears tokens and effectively logs the user out for **any** error — including a network timeout or a `500` from the server. Only a `401` from the refresh endpoint is a genuine auth failure.

**Fix:** Check `error.response?.status === 401` before clearing tokens. For other errors, reject without wiping the session so the user can retry.

---

### B-3 — `dueDate` defaults to `new Date().toISOString()` when missing in API data
**Severity:** Medium
**File:** `src/api/endpoints/tasks.ts:146`

```ts
dueDate: raw.dueDate ?? new Date().toISOString(),
```

If the backend omits `dueDate`, the task is silently assigned today's date. This makes tasks appear overdue or due today immediately after creation, without any indication that the date is synthetic.

**Fix:** Keep `dueDate` as `undefined`/`null` when absent and handle the absence explicitly in the UI (`formatDate` and the `isOverdue` check).

---

### B-4 — `createdAt` similarly defaulted to `new Date()`
**Severity:** Low
**File:** `src/api/endpoints/tasks.ts:158`

```ts
createdAt: raw.createdAt ?? new Date().toISOString(),
```

Same pattern as B-3; the default silently masks missing server data. Prefer `''` or `null` so the UI can render a meaningful empty state.

---

## 2. Type Safety

### T-1 — `as any` cast on FormData in Cloudinary upload
**Severity:** Medium
**File:** `src/api/endpoints/upload.ts:24`

```ts
formData.append('file', { uri: localUri, name: filename, type: mimeType } as any);
```

The `as any` bypasses TypeScript's FormData type. This is a known React Native quirk (the RN runtime accepts the object literal) but the cast silences any future type drift. Consider adding a comment explaining why it's required and narrowing the cast to a local type alias.

---

### T-2 — Unsafe cast when normalising assignee IDs
**Severity:** Medium
**File:** `src/api/endpoints/tasks.ts:133`

```ts
typeof x === 'string' ? x : String((x as { _id?: string })._id ?? ''),
```

If `x` is any other object type (e.g., a number from a malformed response), accessing `._id` would be `undefined`, silently producing an empty string ID that then corrupts downstream lookups. Add an `else` branch or a runtime check.

---

### T-3 — `payload: any` in manager update
**Severity:** Low
**File:** `src/screens/more/ManagersScreen.tsx:104`

```ts
const payload: any = { name: ..., userName: ..., email: ..., phoneNumber: ... };
```

The correct type (`UpdateManagerPayload` or an inline type) is available but not used. Replace `any` with the proper type so the compiler catches mismatches.

---

### T-4 — Inline style width percentage cast to `any`
**Severity:** Low
**File:** `src/screens/reviews/ReviewsScreen.tsx:63`

```ts
<View style={[mStyles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
```

Percentage strings are valid in React Native's `DimensionValue` type in recent versions. The cast can likely be removed or replaced with `\`${pct}%\` as DimensionValue`.

---

## 3. Data Fetching

### DF-1 — No `staleTime` on analytics queries — 5 API calls fire on every tab focus
**Severity:** High
**File:** `src/hooks/useAnalytics.ts:4–38`

All six analytics hooks (`useQuickInsights`, `useGlobalCsat`, `useCsatTrendline`, `useIncidentsOverview`, `useOutletFeedbackSummary`, `useFranchiseAnalytics`) have no `staleTime`. TanStack Query's default `staleTime` is `0`, so every time the user navigates back to the Overview screen all five active queries are considered stale and refetch immediately.

**Fix:** Add `staleTime: 60 * 1000` (or longer — analytics data does not need to be live) to each hook.

---

### DF-2 — No `staleTime` on `useTasks` / `useReviews` — refetches on every screen visit
**Severity:** Medium
**File:** `src/hooks/useTasks.ts:5`, `src/hooks/useReviews.ts` (list hook)

The list queries for tasks and reviews also have no `staleTime`. Every navigation to `TasksScreen` or `ReviewsScreen` triggers a background refetch while still showing the loading spinner for the first mount.

**Fix:** Add `staleTime: 30 * 1000` to these hooks, or at minimum ensure the UI does not show a blocking spinner on refetch (use `isFetching` + `!isLoading` pattern, which is already partially done in some screens but not consistently).

---

### DF-3 — No global Axios timeout configured
**Severity:** Medium
**File:** `src/api/client.ts:6–9`

```ts
const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});
```

No `timeout` is set. Any hanging request (e.g., server under load) will block indefinitely. This is especially risky when paired with the pending-requests queue in the interceptor.

**Fix:** Add `timeout: 15000` (15 s) to `axios.create`.

---

### DF-4 — Cloudinary upload has no timeout
**Severity:** Medium
**File:** `src/api/endpoints/upload.ts:30–33`

```ts
const response = await fetch(
  `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
  { method: 'POST', body: formData },
);
```

`fetch` is used directly (not Axios) so the global timeout does not apply. An upload to a slow CDN will hang the UI with no escape path.

**Fix:** Wrap in `AbortController` with a timeout (e.g., 60 s for uploads), or use `XMLHttpRequest` for progress + abort support.

---

### DF-5 — Analytics queries return raw Axios response — `.data` chained redundantly
**Severity:** Low
**File:** `src/hooks/useAnalytics.ts:7, 13, 19, 25, 31, 37`

```ts
queryFn: () => analyticsApi.getQuickInsights(period).then((r) => r.data),
```

`analyticsApi` methods already return the full Axios response (not the unwrapped data), so chaining `.then((r) => r.data)` is intentional and correct. However, the `.then` is applied inside `queryFn` rather than inside the API layer, which is inconsistent with how other API modules (e.g., `tasks.ts`, `outlets.ts`) handle the unwrapping. Consider moving `.data` unwrapping into the API layer for consistency.

---

## 4. State Management

### SM-1 — `accessToken` in Zustand state is dead state
**Severity:** Medium
**File:** `src/store/authStore.ts:15, 42, 62`

```ts
accessToken: string | null;
...
set({ user: profile, accessToken: data.access_token });
```

The `accessToken` field in the Zustand store is set on login and `restoreSession` but is **never read** from Zustand state in the rest of the codebase. The request interceptor reads the token directly from `tokenStorage.get()`. The `user` field alone drives the auth routing decision in `RootNavigator`. The `accessToken` state field is redundant.

**Fix:** Remove `accessToken` from `AuthState` and the corresponding `set(...)` calls.

---

### SM-2 — `OutletDetailScreen` local edit state duplicates query data
**Severity:** Low
**File:** `src/screens/infrastructure/OutletDetailScreen.tsx:78–97`

Six `useState` variables mirror fields from the `outlet` query, synchronised via a `useEffect`. If the user begins editing and the query refetches in the background, the `useEffect` will overwrite in-progress edits with fresh server data.

**Fix:** Gate the `useEffect` sync with `if (!editing)`:
```ts
useEffect(() => {
  if (outlet && !editing) { /* sync local state */ }
}, [outlet, editing]);
```

---

## 5. Navigation

### N-1 — No runtime guard on `route.params` in detail screens
**Severity:** Medium
**File:** `src/screens/tasks/TaskDetailScreen.tsx:53`, `src/screens/reviews/ReviewDetailScreen.tsx:69`, `src/screens/infrastructure/OutletDetailScreen.tsx:72`

```ts
const { taskId } = route.params;    // TaskDetailScreen
const { reviewId } = route.params;  // ReviewDetailScreen
const { outletId } = route.params;  // OutletDetailScreen
```

TypeScript's `NativeStackScreenProps` enforces param types at compile time, but deep links, push notifications, or future navigation refactors could supply invalid params at runtime. If `route.params` is undefined (e.g., screen opened via an incorrect deep link), accessing `.taskId` crashes immediately.

**Fix:** Add a runtime null check and render an error state:
```ts
if (!route.params?.taskId) {
  return <View><Text>Invalid navigation</Text></View>;
}
```

---

### N-2 — `restoreSession` missing from `useEffect` dependency array
**Severity:** Low
**File:** `src/navigation/RootNavigator.tsx:12–14`

```ts
useEffect(() => {
  restoreSession();
}, []);
```

`restoreSession` is omitted from the dependency array. In practice Zustand actions are stable references so this works correctly, but it triggers a lint warning and may surprise future readers.

**Fix:** Add `restoreSession` to the dependency array, or use `useCallback` in the store definition (Zustand's `create` already produces stable actions, so this is cosmetic).

---

## 6. Performance

### P-1 — Three unsorted-array operations computed on every render in `OverviewScreen`
**Severity:** Medium
**File:** `src/screens/overview/OverviewScreen.tsx:173–175`

```ts
const negativeSorted = [...(feedback.data?.items ?? [])].sort((a, b) => b.negativeFeedbacks - a.negativeFeedbacks);
const totalSorted    = [...(feedback.data?.items ?? [])].sort((a, b) => b.totalFeedbacks    - a.totalFeedbacks);
const resolvedSorted = [...(feedback.data?.items ?? [])].sort((a, b) => b.resolvedFeedbacks - a.resolvedFeedbacks);
```

Three array copies and sorts run on every render (e.g., on every period toggle). Wrap in `useMemo` keyed on `feedback.data`.

---

### P-2 — Inline `renderItem` defined inside `PickerModal` component
**Severity:** Low
**File:** `src/screens/infrastructure/OutletDetailScreen.tsx:56–64`

```tsx
renderItem={({ item }) => {
  const isSelected = selectedArr.includes(item.id);
  return (
    <TouchableOpacity ...>
```

The arrow function is recreated on every render of `PickerModal`, causing every cell in the FlatList to re-render when any parent state changes (e.g., checking a checkbox). Extract as a named component or wrap with `useCallback`.

---

### P-3 — Inline `onPress` handlers in `PeriodSelector` chip list
**Severity:** Low
**File:** `src/screens/overview/OverviewScreen.tsx` (implicit in PeriodSelector render)

`() => onChange(p.value)` is created per-item per-render inside the chip map. Negligible for 3 chips, but consistent with the pattern worth noting.

---

## 7. Security

### S-1 — Refresh token stored in plain `AsyncStorage`
**Severity:** High
**File:** `src/store/authStore.ts:36–38`

```ts
if (data.refresh_token) {
  await AsyncStorage.setItem('refresh_token', data.refresh_token);
}
```

`AsyncStorage` data is stored unencrypted and is accessible to any app running as the same user on a rooted/jailbroken device, and trivially accessible with standard iOS backup tools if backup encryption is not enabled. A refresh token has long-lived API access.

**Fix:** Replace with `expo-secure-store` (`SecureStore.setItemAsync`) which uses the iOS Keychain / Android Keystore, both hardware-backed secure enclaves.

---

### S-2 — Minimum password length is 4 characters
**Severity:** Medium
**File:** `src/screens/more/SettingsScreen.tsx:24`

```ts
if (newPassword.length < 4)
  return Alert.alert('Too short', 'Password must be at least 4 characters.');
```

A 4-character minimum is far below any modern security baseline (NIST recommends ≥ 8). The limit is enforced client-side only anyway, so backend validation should be the real gate, but this should be raised to at least 8 and documented.

---

## 8. Dead Code

### DC-1 — `accessToken` field written but never read from Zustand
**Severity:** Low
**File:** `src/store/authStore.ts:15, 42, 62`

As noted in SM-1, the `accessToken` Zustand field is set but never consumed. Remove it to avoid confusion about where the authoritative token lives.

---

### DC-2 — `payload: any` object construction in `ManagersScreen` could use the existing type
**Severity:** Low
**File:** `src/screens/more/ManagersScreen.tsx:104`

The `payload` variable typed as `any` is immediately passed to `updateManager.mutate`, whose `mutationFn` accepts a typed payload. The explicit `any` annotation suppresses type checking that would otherwise be free.

---

### DC-3 — `GHTouchableOpacity` alias imported for a single use
**Severity:** Low
**File:** `src/screens/reviews/ReviewsScreen.tsx:13`

```ts
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
```

Used exactly once (in `RankingItem`). If the gesture-handler version is not required for a specific interaction reason, the alias and import can be replaced with the standard `TouchableOpacity` from `react-native`, reducing the dependency surface.

---

## 9. Accessibility

### A-1 — `StarRating` component has no accessible label
**Severity:** High
**File:** `src/screens/reviews/ReviewsScreen.tsx:186–193`, `src/screens/reviews/ReviewDetailScreen.tsx:22–31`

```tsx
{[1, 2, 3, 4, 5].map((i) => (
  <Text key={i} style={{ ..., color: i <= Math.round(rating) ? '#f59e0b' : colors.border }}>★</Text>
))}
```

Screen readers will announce five "★" characters with no numeric context. Color is the only differentiator, which is also inaccessible to color-blind users.

**Fix:** Wrap the row in a `View` with `accessibilityLabel={`${Math.round(rating)} out of 5 stars`}` and `accessible={true}`.

---

### A-2 — Priority dot conveys status via colour only
**Severity:** Medium
**File:** `src/screens/tasks/TasksScreen.tsx:68`

```tsx
<View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] ?? colors.textSecondary }]} />
```

The coloured dot has no `accessibilityLabel`. The adjacent `<Text>` shows the priority text, so the dot itself is purely decorative — add `accessibilityElementsHidden={true}` (`importantForAccessibility="no"` on Android) to remove it from the accessibility tree, so screen readers don't stumble over an unlabelled interactive-adjacent element.

---

### A-3 — Delete button (`✕`) has no accessible label
**Severity:** Medium
**File:** `src/screens/infrastructure/InfrastructureScreen.tsx:39–41`

```tsx
<TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
  <Text style={styles.deleteIcon}>✕</Text>
</TouchableOpacity>
```

The `hitSlop` is good, but there is no `accessibilityLabel`. A screen reader will announce "✕" with no context. Add `accessibilityLabel="Delete outlet"` and `accessibilityRole="button"`.

---

### A-4 — `TouchableOpacity` elements throughout lack `accessibilityRole`
**Severity:** Low
**File:** Multiple screens

Many interactive `TouchableOpacity` elements throughout the app (filter chips, action buttons, modal close buttons) do not set `accessibilityRole="button"`. Without it, VoiceOver/TalkBack cannot reliably identify them as interactive.

---

## 10. API Layer

### API-1 — Silently swallows `mapTask` / `mapOutlet` transform errors
**Severity:** Medium
**File:** `src/api/endpoints/tasks.ts:170–173`, `src/api/endpoints/outlets.ts:114–117`, `src/api/endpoints/forms.ts` (list)

```ts
.then((r) => {
  const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawTask[] }).data ?? [];
  return raw.map(mapTask);  // ← throws propagate up uncaught
}),
```

If `mapTask` (or `mapOutlet`, `mapForm`) throws for a malformed record, the entire `.then` chain rejects and TanStack Query marks the query as error — with no indication of which record failed. Because errors surface as generic query errors, users see the same "failed to load" message whether the network is down or one record in 50 is malformed.

**Fix:** Wrap the map in a `try/catch` per item (`.flatMap`) or add a `.catch` handler that logs the offending record and returns `[]` as a safe fallback.

---

### API-2 — No retry logic for transient failures
**Severity:** Medium
**File:** All hooks in `src/hooks/`

TanStack Query's default `retry` is `3` for queries but `0` for mutations. The upload mutation (`uploadToCloudinary`) and all `useMutation` calls have no retry configured. A one-off network hiccup during a task status update or manager creation produces an immediate error alert with no automatic retry.

**Fix:** For idempotent mutations (status updates, uploads), consider `retry: 1` or expose a manual retry button rather than an opaque Alert.

---

### API-3 — `isRefreshing` flag is module-level, not reset on navigation
**Severity:** Low
**File:** `src/api/client.ts:27`

```ts
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];
```

These are module-level singletons. If a refresh succeeds, `isRefreshing` is reset in `finally`. If the app is backgrounded mid-refresh, `isRefreshing` may remain `true` and new requests on resume would queue indefinitely until a subsequent request resolves the pending list.

**Fix:** Add an `AppState` change listener to flush and reset the queue when the app returns to the foreground.

---

### API-4 — Cloudinary `secure_url` absence produces a generic error with no logging
**Severity:** Low
**File:** `src/api/endpoints/upload.ts:35`

```ts
if (!json.secure_url) throw new Error(json.error?.message ?? 'Upload failed');
```

`json.error?.message` may be `undefined` even when the upload failed (e.g., a Cloudinary rate-limit returns a non-standard body). The thrown error would be the string `'Upload failed'` with no diagnostic detail. Log `JSON.stringify(json)` to the console (or a crash reporter) before throwing.

---

## Top 5 Issues to Fix First

| Priority | ID | Issue | Rationale |
|----------|----|-------|-----------|
| 1 | **S-1** | Refresh token in plain AsyncStorage | Credentials are accessible on jailbroken devices and via unencrypted backups. Swap to `SecureStore` in an afternoon. |
| 2 | **B-2** | Token wipe on any refresh error | Users randomly get logged out on slow networks. Easy targeted fix: check `status === 401` before clearing. |
| 3 | **B-1** | `canResolve` logic re-opens settled complaints | A resolved complaint can be "resolved again" due to the stray `overallRating < 2.5` branch. One-line fix. |
| 4 | **DF-1** | No `staleTime` on analytics hooks | Five simultaneous API calls fire every time the Overview tab gets focus. Adding `staleTime` to six hooks eliminates this immediately. |
| 5 | **DF-4 / DF-3** | No timeout on Cloudinary upload or Axios client | An image upload on a poor connection hangs indefinitely with no escape. Add `AbortController` timeout to `uploadToCloudinary` and `timeout: 15000` to `axios.create`. |
