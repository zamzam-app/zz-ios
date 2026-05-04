import { create } from 'zustand';
import client from '../api/client';
import { refreshTokenStorage, tokenStorage } from '../api/storage';
import { syncPushToken } from '../utils/notifications';

export interface AuthUser {
  _id?: string;
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;

  login: (identifier: string, password: string, isAdminLogin: boolean) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  login: async (identifier, password, isAdminLogin) => {
    const payload = isAdminLogin
      ? { email: identifier, password }
      : { userName: identifier, password };

    const { data } = await client.post<{ access_token: string; refresh_token?: string }>(
      '/auth/login',
      payload,
    );

    await tokenStorage.set(data.access_token);

    if (data.refresh_token) {
      await refreshTokenStorage.set(data.refresh_token);
    } else {
      await refreshTokenStorage.clear();
    }

    const { data: profile } = await client.get<AuthUser>('/auth/profile');

    set({ user: profile });
    void syncPushToken();
  },

  logout: async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // best-effort
    }
    await tokenStorage.clear();
    await refreshTokenStorage.clear();
    set({ user: null });
  },

  restoreSession: async () => {
    try {
      const token = await tokenStorage.get();
      if (!token) return;

      const { data: profile } = await client.get<AuthUser>('/auth/profile');
      set({ user: profile });
      void syncPushToken();
    } catch {
      await tokenStorage.clear();
    } finally {
      set({ isLoading: false });
    }
  },
}));
