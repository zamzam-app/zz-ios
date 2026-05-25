import client from '../../client';
import { mapListSafely } from '../mapListSafely';

import { mapTaskCategory } from './taskMappers';
import type { RawTaskCategory, TaskCategoryOption } from './taskTypes';

export async function listCategories(): Promise<TaskCategoryOption[]> {
  const response = await client.get<{ data: RawTaskCategory[] } | RawTaskCategory[]>(
    '/task-category',
    {
      params: { limit: 100 },
    },
  );
  const raw = Array.isArray(response.data)
    ? response.data
    : ((response.data as { data: RawTaskCategory[] }).data ?? []);
  return mapListSafely(raw, 'task-categories', mapTaskCategory).filter(
    (category) => category.id.length > 0 && category.name.length > 0,
  );
}

export async function createCategory(payload: { name: string; description: string }) {
  const r = await client.post<RawTaskCategory>('/task-category', payload);
  return mapTaskCategory(r.data);
}

export async function updateCategory(id: string, payload: { name?: string; description?: string }) {
  const r = await client.patch<RawTaskCategory>(`/task-category/${id}`, payload);
  return mapTaskCategory(r.data);
}

export function deleteCategory(id: string) {
  return client.delete(`/task-category/${id}`);
}
