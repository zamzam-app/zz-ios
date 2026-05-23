import client from '../../client';
import { mapListSafely } from '../mapListSafely';

import { mapTask } from './taskMappers';
import type {
  RawTask,
  TaskStatus,
  TasksQuery,
  TasksListMeta,
  CreateTaskPayload,
  UpdateTaskPayload,
} from './taskTypes';

export async function listPaginated(query?: TasksQuery) {
  const r = await client.get<{ data: RawTask[]; meta?: Partial<TasksListMeta> } | RawTask[]>(
    '/tasks',
    {
      params: query,
    },
  );
  const dataRoot = Array.isArray(r.data) ? { data: r.data } : r.data;
  const raw = dataRoot.data ?? [];
  const mapped = mapListSafely(raw, 'tasks', mapTask);
  const fallbackLimit = query?.limit ?? raw.length ?? 0;
  const currentPage = dataRoot.meta?.currentPage ?? query?.page ?? 1;
  const total = dataRoot.meta?.total ?? mapped.length;
  return {
    data: mapped,
    meta: {
      total,
      currentPage,
      hasPrevPage: dataRoot.meta?.hasPrevPage ?? currentPage > 1,
      hasNextPage: dataRoot.meta?.hasNextPage ?? currentPage * fallbackLimit < total,
      limit: dataRoot.meta?.limit ?? fallbackLimit,
    },
  };
}

export async function list(query?: TasksQuery) {
  const r = await listPaginated(query);
  return r.data;
}

export async function getById(id: string) {
  const r = await client.get<RawTask>(`/tasks/${id}`);
  return mapTask(r.data);
}

export async function create(payload: CreateTaskPayload) {
  const r = await client.post<RawTask>('/tasks', payload);
  return mapTask(r.data);
}

export async function update(id: string, payload: UpdateTaskPayload) {
  const r = await client.patch<RawTask>(`/tasks/${id}`, payload);
  return mapTask(r.data);
}

export async function updateStatus(id: string, status: TaskStatus) {
  const r = await client.patch<RawTask>(`/tasks/${id}/status`, { status });
  return mapTask(r.data);
}

export function remove(id: string) {
  return client.delete(`/tasks/${id}`);
}
