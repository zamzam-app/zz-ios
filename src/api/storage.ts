import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'access_token';

export const tokenStorage = {
  get: () => AsyncStorage.getItem(ACCESS_TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(ACCESS_TOKEN_KEY, token),
  clear: () => AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
};
