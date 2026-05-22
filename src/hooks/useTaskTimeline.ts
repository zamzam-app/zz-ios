import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/endpoints/tasks';
import { cursorPageParam, cursorQueryFn } from '../utils/pagination';
import type {
  SerializedTimelineEvent,
  TaskDetailTimelineResponse,
  EventTypeCounts,
  TimelineQuery,
} from '../types/task';

// ─── Task Detail (Summary + First Timeline Page) ────────────────────────────

/**
 * Fetch task detail including summary metadata and the first page of the
 * timeline.
 *
 * Query key: `['taskDetail', taskId]`
 */
export const useTaskDetail = (
  taskId: string,
  options?: { enabled?: boolean; initialTimelineLimit?: number },
) =>
  useQuery<TaskDetailTimelineResponse>({
    queryKey: ['taskDetail', taskId],
    queryFn: () => tasksApi.getTaskDetail(taskId, options?.initialTimelineLimit),
    enabled: (options?.enabled ?? true) && !!taskId,
  });

// ─── Timeline (Cursor-Paginated Event Log) ──────────────────────────────────

/**
 * Cursor-paginated timeline of task events, newest-first.
 *
 * Query key: `['taskTimeline', taskId]` or `['taskTimeline', taskId, { types }]`
 * when an event-type filter is active.
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
 *   useTaskTimeline(taskId, { types: [TaskEventType.COMMENTED] });
 *
 * const events = flattenInfiniteData(data);
 * ```
 */
export const useTaskTimeline = (
  taskId: string,
  filters?: { types?: TimelineQuery['types'] },
  options?: { enabled?: boolean },
) => {
  const typesParam = filters?.types?.length ? filters.types : undefined;

  return useInfiniteQuery({
    queryKey: typesParam
      ? ['taskTimeline', taskId, { types: typesParam }]
      : ['taskTimeline', taskId],
    queryFn: cursorQueryFn(
      (cursor: string | undefined) => tasksApi.getTimeline(taskId, { cursor, types: typesParam }),
      undefined as void,
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: cursorPageParam<SerializedTimelineEvent>(),
    enabled: (options?.enabled ?? true) && !!taskId,
  });
};

// ─── Event Type Counts ──────────────────────────────────────────────────────

/**
 * Get the count of events grouped by type for a task.
 * Used to populate timeline filter chips (e.g. "Comments (12)").
 *
 * Query key: `['eventTypeCounts', taskId]`
 */
export const useEventTypeCounts = (taskId: string, options?: { enabled?: boolean }) =>
  useQuery<EventTypeCounts>({
    queryKey: ['eventTypeCounts', taskId],
    queryFn: () => tasksApi.getEventTypeCounts(taskId),
    enabled: (options?.enabled ?? true) && !!taskId,
  });
