import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import { tasksApi } from '../../api/endpoints/tasks';
import type {
  SerializedTimelineEvent,
  TaskDetailTimelineResponse,
  EventTypeCounts,
  TimelineQuery,
} from '../../types/task';
import { cursorPageParam, cursorQueryFn } from '../../utils/pagination';

// ─── Task Detail (Summary + First Timeline Page) ────────────────────────────

export const useTaskDetail = (
  taskId: string,
  options?: { enabled?: boolean; initialTimelineLimit?: number },
) =>
  useQuery<TaskDetailTimelineResponse>({
    queryKey: ['taskDetail', taskId],
    queryFn: () => tasksApi.getTaskDetail(taskId, options?.initialTimelineLimit),
    enabled: (options?.enabled ?? true) && !!taskId,
  });

// ─── Timeline (Cursor-paginated timeline of task events, newest-first.) ──────

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

export const useEventTypeCounts = (taskId: string, options?: { enabled?: boolean }) =>
  useQuery<EventTypeCounts>({
    queryKey: ['eventTypeCounts', taskId],
    queryFn: () => tasksApi.getEventTypeCounts(taskId),
    enabled: (options?.enabled ?? true) && !!taskId,
  });
