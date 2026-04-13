import client from '../client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  outlets?: string[];
}

interface RawUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  outlets?: Array<string | { _id?: string; id?: string }>;
}

function mapUser(raw: RawUser): User {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    email: raw.email ?? '',
    role: raw.role ?? '',
    outlets: Array.isArray(raw.outlets)
      ? raw.outlets
        .map((outlet) => (typeof outlet === 'string' ? outlet : String(outlet._id ?? outlet.id ?? '')))
        .filter(Boolean)
      : undefined,
  };
}

export const usersApi = {
  list: (role?: string) =>
    client
      .get<{ data: RawUser[] } | RawUser[]>('/users', { params: { limit: 100, role } })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawUser[] }).data ?? [];
        return raw.map(mapUser);
      }),
};
