import { create } from 'zustand';
import client from '../api/client';
import { refreshTokenStorage, tokenStorage } from '../api/storage';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,

  login: async (email, password) => {
    const { data } = await client.post<{ access_token: string; refresh_token?: string }>(
      '/auth/login',
      { email, password },
    );

    await tokenStorage.set(data.access_token);

    if (data.refresh_token) {
      await refreshTokenStorage.set(data.refresh_token);
    } else {
      await refreshTokenStorage.clear();
    }

    const { data: profile } = await client.get<AuthUser>('/auth/profile');

    set({ user: profile, accessToken: data.access_token });
  },

  logout: async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // best-effort
    }
    await tokenStorage.clear();
    await refreshTokenStorage.clear();
    set({ user: null, accessToken: null });
  },

  restoreSession: async () => {
    try {
      const token = await tokenStorage.get();
      if (!token) return;

      const { data: profile } = await client.get<AuthUser>('/auth/profile');
      set({ user: profile, accessToken: token });
    } catch {
      await tokenStorage.clear();
    } finally {
      set({ isLoading: false });
    }
  },
}));
