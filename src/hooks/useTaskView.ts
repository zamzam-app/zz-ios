import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/endpoints/tasks';
import { cursorPageParam, cursorQueryFn, flattenInfiniteData } from '../utils/pagination';
import type {
  UnreadTaskCount,
  AggregatedUnread,
  RecentlyViewedTask,
  RecentlyViewedQuery,
} from '../types/task';

// ─── Unread Queries ─────────────────────────────────────────────────────────

/**
 * Fetch per-task unread counts. Only returns tasks with `unreadCount > 0`.
 * Tasks NOT in this response should have their badges cleared.
 *
 * Query key: `['unread', 'counts']`
 */
export const useUnreadCount = (limit?: number) =>
  useQuery<UnreadTaskCount[]>({
    queryKey: ['unread', 'counts', limit].filter((x) => x != null),
    queryFn: () => tasksApi.getUnreadCount(limit),
    // Unread counts should refresh frequently
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Poll every minute as fallback
  });

/**
 * Fetch the total aggregated unread count for the app icon badge.
 *
 * Query key: `['unread', 'aggregated']`
 */
export const useUnreadAggregated = () =>
  useQuery<AggregatedUnread>({
    queryKey: ['unread', 'aggregated'],
    queryFn: tasksApi.getUnreadAggregated,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

/**
 * Fetch a lightweight list of task IDs that have unread events.
 * Useful for highlighting tasks without needing per-task counts.
 *
 * Query key: `['unread', 'ids']`
 */
export const useUnreadIds = () =>
  useQuery<string[]>({
    queryKey: ['unread', 'ids'],
    queryFn: tasksApi.getUnreadIds,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

/**
 * Cursor-paginated list of recently viewed tasks.
 *
 * Query key: `['unread', 'recentlyViewed']`
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useRecentlyViewed({ limit: 20 });
 * const items = flattenInfiniteData(data);
 * ```
 */
export const useRecentlyViewed = (
  query?: Omit<RecentlyViewedQuery, 'cursor'>,
  options?: { enabled?: boolean },
) =>
  useInfiniteQuery({
    queryKey: ['unread', 'recentlyViewed', query],
    queryFn: cursorQueryFn(
      (cursor: string | undefined) =>
        tasksApi.getRecentlyViewed({ ...query, cursor }),
      undefined as void,
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: cursorPageParam<RecentlyViewedTask>(),
    enabled: options?.enabled ?? true,
  });

// ─── View Tracking Mutations ────────────────────────────────────────────────

/**
 * Mark a single task as viewed by the current user.
 * Called when the task detail screen mounts.
 *
 * Upserts a `TaskView` record and resets the user's `unreadMap` entry.
 *
 * Cache invalidation:
 *   - `['unread', 'counts']` — refresh per-task counts
 *   - `['unread', 'aggregated']` — refresh badge total
 *   - `['unread', 'ids']` — refresh ID list
 *   - `['task', taskId]` — refresh task cache (unreadCount may have changed)
 */
export const useMarkTaskViewed = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => tasksApi.markTaskViewed(taskId),
    onSuccess: (_data, taskId) => {
      qc.invalidateQueries({ queryKey: ['unread'] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['taskDetail', taskId] });
    },
  });
};

/**
 * Mark multiple tasks as viewed in a single request.
 * Use for bulk-marking (e.g. "mark all as read").
 *
 * Cache invalidation:
 *   - Same as single view, but for each task ID
 */
export const useMarkMultipleViewed = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: string[]) => tasksApi.markMultipleTasksViewed(taskIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unread'] });
      // Invalidate all task caches that may have unreadCount changes
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task'] });
      qc.invalidateQueries({ queryKey: ['taskDetail'] });
    },
  });
};
