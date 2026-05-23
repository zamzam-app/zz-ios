import type {
  TimelineQuery,
  TaskDetailTimelineResponse,
  PaginatedResponse,
  SerializedTimelineEvent,
  EventTypeCounts,
} from '../../../types/task';
import client from '../../client';

export function getTaskDetail(id: string, initialTimelineLimit?: number) {
  return client
    .get<TaskDetailTimelineResponse>(`/tasks/${id}/detail`, {
      params: initialTimelineLimit ? { limit: initialTimelineLimit } : undefined,
    })
    .then((r) => r.data);
}

export function getTimeline(id: string, query?: TimelineQuery) {
  return client
    .get<PaginatedResponse<SerializedTimelineEvent>>(`/tasks/${id}/timeline`, {
      params: query,
    })
    .then((r) => r.data);
}

export function getEventTypeCounts(id: string) {
  return client.get<EventTypeCounts>(`/tasks/${id}/events/type-counts`).then((r) => r.data);
}
