/**
 * Cursor pagination utilities for cursor-paginated endpoints
 * (timeline, recently-viewed, attachments).
 *
 * Cursor format: base64-encoded JSON
 *   Timeline:     base64({ "sortKey": "m0d8f1-a1b2c3d4" })
 *   RecentlyViewed: base64({ "lastViewedAt": "2026-04-27T10:30:00.000Z" })
 *   Attachments:  base64({ "createdAt": "2026-04-27T10:30:00.000Z" })
 */

// ─── Cursor Encoding / Decoding ─────────────────────────────────────────────

/**
 * Encode a plain object into a base64 cursor string.
 * Throws if JSON.stringify or btoa fails.
 */
export function encodeCursor<T extends Record<string, unknown>>(obj: T): string {
  try {
    const json = JSON.stringify(obj);
    return btoa(json);
  } catch (err) {
    throw new Error(
      `[pagination] failed to encode cursor: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Decode a base64 cursor string back into a plain object.
 *
 * Returns `null` for:
 * - empty / null / undefined input
 * - invalid base64
 * - invalid JSON after decoding
 *
 * The caller should treat `null` as "first page, no cursor".
 */
export function decodeCursor<T = Record<string, unknown>>(
  cursor: string | null | undefined,
): T | null {
  if (!cursor) return null;

  let decoded: string;
  try {
    decoded = atob(cursor);
  } catch {
    console.warn(`[pagination] malformed base64 cursor, falling back to first page`);
    return null;
  }

  try {
    return JSON.parse(decoded) as T;
  } catch {
    console.warn(`[pagination] malformed JSON in decoded cursor, falling back to first page`);
    return null;
  }
}

// ─── React Query Integration ────────────────────────────────────────────────

import type { InfiniteData, QueryKey } from '@tanstack/react-query';
import type { PaginatedResponse } from '../types/task';

/**
 * Factory for `getNextPageParam` in cursor-based `useInfiniteQuery`.
 *
 * Extracts `nextCursor` from the last page and returns `undefined`
 * (no more pages) when `hasMore` is false or `nextCursor` is null.
 *
 * @example
 * ```ts
 * useInfiniteQuery({
 *   queryKey: ['taskTimeline', taskId],
 *   queryFn: ({ pageParam }) => api.getTimeline(taskId, { cursor: pageParam }),
 *   initialPageParam: undefined as string | undefined,
 *   getNextPageParam: cursorPageParam(),
 * });
 * ```
 */
export function cursorPageParam<T>(): (
  lastPage: PaginatedResponse<T>,
  _allPages: PaginatedResponse<T>[],
) => string | undefined {
  return (lastPage: PaginatedResponse<T>) =>
    lastPage.hasMore && lastPage.nextCursor != null ? lastPage.nextCursor : undefined;
}

/**
 * Type for a cursor-paginated query function.
 * The first call receives `cursor = undefined` (first page).
 */
export type CursorQueryFn<TData, TParams = void> = (
  cursor: string | undefined,
  params?: TParams,
) => Promise<PaginatedResponse<TData>>;

/**
 * Creates a React Query `queryFn`-compatible function from a
 * cursor-based API function and optional static params.
 *
 * @example
 * ```ts
 * const queryFn = cursorQueryFn(
 *   (cursor, taskId: string) => tasksApi.getTimeline(taskId, { cursor }),
 *   taskId,
 * );
 * ```
 */
export function cursorQueryFn<TData, TParams>(
  apiFn: CursorQueryFn<TData, TParams>,
  params: TParams,
): (context: { pageParam: string | undefined }) => Promise<PaginatedResponse<TData>> {
  return ({ pageParam }: { pageParam: string | undefined }) => apiFn(pageParam, params);
}

// ─── Data Flattening ────────────────────────────────────────────────────────

/**
 * Flatten all pages from an `InfiniteData` response into a single array.
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useTaskTimeline(taskId);
 * const events = flattenInfiniteData(data);
 * // events is T[] — all events from all loaded pages
 * ```
 */
export function flattenInfiniteData<T>(data: InfiniteData<PaginatedResponse<T>> | undefined): T[] {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.data);
}

/**
 * Count total items loaded across all pages.
 */
export function infiniteDataItemCount<T>(
  data: InfiniteData<PaginatedResponse<T>> | undefined,
): number {
  if (!data?.pages) return 0;
  return data.pages.reduce((sum, page) => sum + page.data.length, 0);
}
