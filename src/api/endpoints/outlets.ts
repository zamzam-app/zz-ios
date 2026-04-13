import client from '../client';

export interface Outlet {
  id: string;
  name: string;
  description?: string;
  address?: string;
  outletTypeId?: string;
  outletTypeName?: string;
  managerNames?: string[];
  managerIds?: string[];
  rating: number;
  totalFeedback: number;
  images?: string[];
  qrToken?: string;
}

export interface CreateOutletPayload {
  name: string;
  description?: string;
  address?: string;
  outletType: string;
  managerIds?: string[];
}

export interface UpdateOutletPayload {
  name?: string;
  description?: string;
  address?: string;
  outletType?: string;
  managerIds?: string[];
}

interface RawOutlet {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  address?: string;
  outletTypeId?: string | { _id?: string; name?: string };
  outletTypeName?: string;
  managerNames?: string[];
  managerIds?: Array<string | { _id?: string; name?: string }>;
  managers?: Array<{ _id?: string; name?: string }>;
  rating?: number;
  totalFeedback?: number;
  images?: string[];
  qrToken?: string;
}

function mapOutlet(raw: RawOutlet): Outlet {
  const id = String(raw._id ?? raw.id ?? '');

  let outletTypeId: string | undefined;
  let outletTypeName: string | undefined;
  if (typeof raw.outletTypeId === 'object' && raw.outletTypeId) {
    outletTypeId = String(raw.outletTypeId._id ?? '');
    outletTypeName = raw.outletTypeId.name;
  } else if (typeof raw.outletTypeId === 'string') {
    outletTypeId = raw.outletTypeId;
    outletTypeName = raw.outletTypeName;
  }

  let managerNames = raw.managerNames ?? [];
  let managerIds = Array.isArray(raw.managerIds)
    ? raw.managerIds
      .map((m) => (typeof m === 'string' ? m : String(m._id ?? '')))
      .filter(Boolean)
    : [];
  if (managerNames.length === 0 && Array.isArray(raw.managerIds)) {
    managerNames = raw.managerIds
      .map((m) => (typeof m === 'string' ? '' : (m.name ?? '').trim()))
      .filter(Boolean);
  }
  if (Array.isArray(raw.managers) && raw.managers.length > 0) {
    managerIds = raw.managers.map((m) => String(m._id ?? '')).filter(Boolean);
    managerNames = raw.managers.map((m) => m.name ?? '').filter(Boolean);
  }

  return {
    id,
    name: raw.name ?? '',
    description: raw.description,
    address: raw.address,
    outletTypeId,
    outletTypeName,
    managerIds,
    managerNames,
    rating: raw.rating ?? 0,
    totalFeedback: raw.totalFeedback ?? 0,
    images: raw.images,
    qrToken: raw.qrToken,
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

  getById: (id: string) =>
    client.get<RawOutlet>(`/outlet/${id}`).then((r) => mapOutlet(r.data)),

  create: (payload: CreateOutletPayload) =>
    client.post<RawOutlet>('/outlet', payload).then((r) => mapOutlet(r.data)),

  update: (id: string, payload: UpdateOutletPayload) =>
    client.patch<RawOutlet>(`/outlet/${id}`, payload).then((r) => mapOutlet(r.data)),

  delete: (id: string) => client.delete(`/outlet/${id}`),
};
