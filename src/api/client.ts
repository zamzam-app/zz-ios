import axios, { AxiosError } from 'axios';
import { tokenStorage } from './storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL + '/api';

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
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
// If refresh also fails, clear the session — the auth store / navigator
// will detect the missing token and redirect to Login.

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

const flushPending = (token: string) => {
  pendingRequests.forEach((resolve) => resolve(token));
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
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue requests while a refresh is already in flight
      return new Promise((resolve) => {
        pendingRequests.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(client(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await client.post<{ access_token: string }>('/auth/refresh');
      await tokenStorage.set(data.access_token);
      flushPending(data.access_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return client(original);
    } catch {
      await tokenStorage.clear();
      pendingRequests = [];
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export default client;
