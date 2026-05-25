import client from '../client';

import { mapListSafely } from './mapListSafely';

export interface OutletType {
  id: string;
  name: string;
  description: string;
}

interface RawOutletType {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
}

function mapOutletType(raw: RawOutletType): OutletType {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    description: raw.description ?? '',
  };
}

export const outletTypesApi = {
  list: () =>
    client
      .get<{ data: RawOutletType[] } | RawOutletType[]>('/outlet-type', { params: { limit: 100 } })
      .then((r) => {
        const raw = Array.isArray(r.data)
          ? r.data
          : ((r.data as { data: RawOutletType[] }).data ?? []);
        return mapListSafely(raw, 'outlet-types', mapOutletType);
      }),

  create: (payload: { name: string; description: string }) =>
    client.post<RawOutletType>('/outlet-type', payload).then((r) => mapOutletType(r.data)),

  update: (id: string, payload: { name?: string; description?: string }) =>
    client.patch<RawOutletType>(`/outlet-type/${id}`, payload).then((r) => mapOutletType(r.data)),

  delete: async (id: string) => {
    await client.delete(`/outlet-type/${id}`);
  },
};
