import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SECURE_STORE_MAX_VALUE_BYTES = 2048;

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'zz_ios_auth',
};

const assertTokenIsSafeToStore = (token: unknown, label: string): string => {
  if (typeof token !== 'string') {
    throw new Error(`Invalid ${label} type. Expected string.`);
  }

  const utf8Bytes = new TextEncoder().encode(token).length;

  if (utf8Bytes > SECURE_STORE_MAX_VALUE_BYTES) {
    throw new Error(
      `${label} size (${utf8Bytes} bytes) exceeds secure storage limit (${SECURE_STORE_MAX_VALUE_BYTES} bytes).`,
    );
  }

  return token;
};

export const tokenStorage = {
  get: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
  set: async (token: string) => {
    const safeToken = assertTokenIsSafeToStore(token, 'access token');
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, safeToken, SECURE_STORE_OPTIONS);
  },
  clear: () => SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS),
};

export const refreshTokenStorage = {
  get: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
  set: async (token: string) => {
    const safeToken = assertTokenIsSafeToStore(token, 'refresh token');
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, safeToken, SECURE_STORE_OPTIONS);

    // Defensive read-after-write catches older platform/plugin edge cases
    // where writes may appear successful but are not persisted.
    const persistedToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS);
    if (persistedToken !== safeToken) {
      throw new Error('Failed to persist refresh token in secure storage.');
    }
  },
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
};
