import { create } from 'zustand';

import { authApi, AuthUser } from '../api/endpoints/authApi';
import { queryClient } from '../api/queryClient';
import { refreshTokenStorage, tokenStorage } from '../api/storage';
import { syncPushToken } from '../utils/notifications';

let authSessionRevision = 0;

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
    authSessionRevision += 1;

    const data = await authApi.login(identifier, password, isAdminLogin);

    await tokenStorage.set(data.access_token);

    if (data.refresh_token) {
      await refreshTokenStorage.set(data.refresh_token);
    } else {
      await refreshTokenStorage.clear();
    }

    const profile = await authApi.getProfile();

    set({ user: profile });
    void syncPushToken();
  },

  logout: async () => {
    authSessionRevision += 1;

    // Clear local auth state first so navigation immediately switches to Auth flow.
    set({ user: null });
    queryClient.clear();

    try {
      await authApi.logout();
    } catch {
      // best-effort
    }

    await tokenStorage.clear();
    await refreshTokenStorage.clear();
  },

  restoreSession: async () => {
    const restoreRevision = authSessionRevision;
    try {
      const token = await tokenStorage.get();
      if (!token) return;

      const profile = await authApi.getProfile();
      if (restoreRevision !== authSessionRevision) return;
      set({ user: profile });
      void syncPushToken();
    } catch {
      await tokenStorage.clear();
    } finally {
      set({ isLoading: false });
    }
  },
}));
