import client from '../client';

export interface Outlet {
  id: string;
  name: string;
  outletType?: string;
}

interface RawOutlet {
  _id?: string;
  id?: string;
  name?: string;
  outletType?: string;
}

function mapOutlet(raw: RawOutlet): Outlet {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    outletType: raw.outletType,
  };
}

export const outletsApi = {
  list: () =>
    client
      .get<{ data: RawOutlet[] } | RawOutlet[]>('/outlet', { params: { limit: 100 } })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawOutlet[] }).data ?? [];
        return raw.map(mapOutlet);
      }),
};
