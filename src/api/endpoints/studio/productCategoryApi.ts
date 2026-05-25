import client from '../../client';
import { mapListSafely } from '../mapListSafely';

import { mapCategory } from './productMappers';
import type { RawCategory } from './productMappers';

export const categoriesApi = {
  list: () =>
    client
      .get<{ data: RawCategory[] } | RawCategory[]>('/category', { params: { limit: 100 } })
      .then((r) => {
        const raw = Array.isArray(r.data)
          ? r.data
          : ((r.data as { data: RawCategory[] }).data ?? []);
        return mapListSafely(raw, 'categories', mapCategory);
      }),

  create: (payload: { name: string; description?: string }) =>
    client.post<RawCategory>('/category', payload).then((r) => mapCategory(r.data)),

  update: (id: string, payload: { name?: string; description?: string }) =>
    client.patch<RawCategory>(`/category/${id}`, payload).then((r) => mapCategory(r.data)),

  delete: (id: string) => client.delete(`/category/${id}`),
};
