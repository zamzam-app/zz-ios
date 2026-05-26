import type {
  UnreadTaskCount,
  AggregatedUnread,
  RecentlyViewedTask,
  RecentlyViewedQuery,
  PaginatedResponse,
} from '../../../types/task';
import client from '../../client';

import type { TasksQuery } from './taskTypes';

export function markTaskViewed(id: string) {
  return client.post<void>(`/tasks/${id}/view`).then(() => undefined);
}

export function markMultipleTasksViewed(taskIds: string[]) {
  return client.post<void>('/tasks/view-all', { taskIds }).then(() => undefined);
}

export function getUnreadCount(limit?: number) {
  return client
    .get<UnreadTaskCount[]>('/tasks/unread-count', {
      params: limit ? { limit } : undefined,
    })
    .then((r) => r.data);
}

export function getUnreadAggregated() {
  return client.get<AggregatedUnread>('/tasks/unread-aggregated').then((r) => r.data);
}

export function getUnreadIds(query?: Omit<TasksQuery, 'page' | 'limit'>) {
  return client
    .get<string[]>('/tasks/unread-ids', {
      params: query,
    })
    .then((r) => r.data);
}

export function getRecentlyViewed(query?: RecentlyViewedQuery) {
  return client
    .get<PaginatedResponse<RecentlyViewedTask>>('/tasks/recently-viewed', {
      params: query,
    })
    .then((r) => r.data);
}
