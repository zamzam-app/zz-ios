import axios, { AxiosError } from 'axios';
import { tokenStorage } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL + '/api';

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15_000,
});

// ─── Request interceptor ─────────────────────────────────────────────────────
// Attach the stored access token to every request.

client.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor ────────────────────────────────────────────────────
// On 401: attempt one token refresh, retry the original request.
// If refresh returns 401, clear session; otherwise preserve tokens so
// transient failures (timeouts/5xx) do not force logout.

let isRefreshing = false;
let pendingRequests: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const flushPendingSuccess = (token: string) => {
  pendingRequests.forEach(({ resolve }) => resolve(token));
  pendingRequests = [];
};

const flushPendingFailure = (error: unknown) => {
  pendingRequests.forEach(({ reject }) => reject(error));
  pendingRequests = [];
};

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config;

    if (error.response?.status !== 401 || !original) {
      return Promise.reject(error);
    }

    // Avoid infinite loop if the refresh call itself 401s
    if (original.url === '/auth/refresh') {
      await tokenStorage.clear();
      flushPendingFailure(error);
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue requests while a refresh is already in flight
      return new Promise((resolve, reject) => {
        pendingRequests.push({
          resolve: (token: string) => {
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${token}`;
            resolve(client(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await client.post<{ access_token: string }>('/auth/refresh');
      await tokenStorage.set(data.access_token);
      flushPendingSuccess(data.access_token);
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return client(original);
    } catch (refreshError) {
      const refreshStatus = axios.isAxiosError(refreshError)
        ? refreshError.response?.status
        : undefined;

      if (refreshStatus === 401) {
        await tokenStorage.clear();
      }

      flushPendingFailure(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default client;
