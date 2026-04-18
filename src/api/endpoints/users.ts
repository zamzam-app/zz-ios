import client from '../client';
import { mapListSafely } from './mapListSafely';

export interface User {
  id: string;
  name: string;
  email: string;
  userName?: string;
  phoneNumber?: string;
  role: string;
  outlets?: string[];
  isActive?: boolean;
}

export interface CreateManagerPayload {
  name: string;
  userName: string;
  email: string;
  role: 'manager';
  phoneNumber?: string;
  password: string;
}

export interface UpdateManagerPayload {
  name?: string;
  userName?: string;
  email?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

interface RawUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  userName?: string;
  phoneNumber?: string;
  role?: string;
  outlets?: Array<string | { _id?: string; id?: string }>;
  isActive?: boolean;
}

function mapUser(raw: RawUser): User {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    email: raw.email ?? '',
    userName: raw.userName,
    phoneNumber: raw.phoneNumber,
    role: raw.role ?? '',
    outlets: Array.isArray(raw.outlets)
      ? raw.outlets
        .map((outlet) => (typeof outlet === 'string' ? outlet : String(outlet._id ?? outlet.id ?? '')))
        .filter(Boolean)
      : undefined,
    isActive: raw.isActive,
  };
}

export const usersApi = {
  list: (role?: string) =>
    client
      .get<{ data: RawUser[] } | RawUser[]>('/users', { params: { limit: 100, role } })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawUser[] }).data ?? [];
        return mapListSafely(raw, 'users', mapUser);
      }),

  create: (payload: CreateManagerPayload) =>
    client.post<RawUser>('/users', payload).then((r) => mapUser(r.data)),

  update: (id: string, payload: UpdateManagerPayload) =>
    client.patch<RawUser>(`/users/${id}`, payload).then((r) => mapUser(r.data)),

  delete: (id: string) => client.delete(`/users/${id}`),

  changePassword: (id: string, payload: ChangePasswordPayload) =>
    client.post(`/users/change-password/${id}`, {
      oldPassword: payload.oldPassword,
      newPassword: payload.newPassword,
    }),
};
