"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenStorage = exports.tokenStorage = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const SecureStore = __importStar(require("expo-secure-store"));
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SECURE_STORE_MAX_VALUE_BYTES = 2048;
const SECURE_STORE_OPTIONS = {
    keychainService: 'zz_ios_auth',
};
exports.tokenStorage = {
    get: () => async_storage_1.default.getItem(ACCESS_TOKEN_KEY),
    set: (token) => async_storage_1.default.setItem(ACCESS_TOKEN_KEY, token),
    clear: () => async_storage_1.default.removeItem(ACCESS_TOKEN_KEY),
};
const assertRefreshTokenIsSafeToStore = (token) => {
    if (typeof token !== 'string') {
        throw new Error('Invalid refresh token type. Expected string.');
    }
    const utf8Bytes = new TextEncoder().encode(token).length;
    if (utf8Bytes > SECURE_STORE_MAX_VALUE_BYTES) {
        throw new Error(`Refresh token size (${utf8Bytes} bytes) exceeds secure storage limit (${SECURE_STORE_MAX_VALUE_BYTES} bytes).`);
    }
    return token;
};
exports.refreshTokenStorage = {
    get: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS),
    set: async (token) => {
        const safeToken = assertRefreshTokenIsSafeToStore(token);
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
