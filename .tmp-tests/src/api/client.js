"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const storage_1 = require("./storage");
const env_1 = require("../config/env");
const client = axios_1.default.create({
    baseURL: env_1.API_URL,
    withCredentials: true,
    timeout: 15000,
});
// ─── Request interceptor ─────────────────────────────────────────────────────
// Attach the stored access token to every request.
client.interceptors.request.use(async (config) => {
    const token = await storage_1.tokenStorage.get();
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
let pendingRequests = [];
const flushPendingSuccess = (token) => {
    pendingRequests.forEach(({ resolve }) => resolve(token));
    pendingRequests = [];
};
const flushPendingFailure = (error) => {
    pendingRequests.forEach(({ reject }) => reject(error));
    pendingRequests = [];
};
client.interceptors.response.use((response) => response, async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || !original) {
        return Promise.reject(error);
    }
    // Avoid infinite loop if the refresh call itself 401s
    if (original.url === '/auth/refresh') {
        await storage_1.tokenStorage.clear();
        flushPendingFailure(error);
        return Promise.reject(error);
    }
    if (isRefreshing) {
        // Queue requests while a refresh is already in flight
        return new Promise((resolve, reject) => {
            pendingRequests.push({
                resolve: (token) => {
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
        const { data } = await client.post('/auth/refresh');
        await storage_1.tokenStorage.set(data.access_token);
        flushPendingSuccess(data.access_token);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return client(original);
    }
    catch (refreshError) {
        const refreshStatus = axios_1.default.isAxiosError(refreshError)
            ? refreshError.response?.status
            : undefined;
        if (refreshStatus === 401) {
            await storage_1.tokenStorage.clear();
        }
        flushPendingFailure(refreshError);
        return Promise.reject(refreshError);
    }
    finally {
        isRefreshing = false;
    }
});
exports.default = client;
