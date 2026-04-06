import client from '../client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface RawUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

function mapUser(raw: RawUser): User {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    email: raw.email ?? '',
    role: raw.role ?? '',
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
