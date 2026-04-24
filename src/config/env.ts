const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const apiBaseFromEnv = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const qrBaseFromEnv = process.env.EXPO_PUBLIC_QR_REVIEW_BASE_URL ?? 'https://zz-user.vercel.app';

export const API_BASE_URL = trimTrailingSlash(apiBaseFromEnv);
export const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '';
export const QR_REVIEW_BASE_URL = trimTrailingSlash(qrBaseFromEnv);
