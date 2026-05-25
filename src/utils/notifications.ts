import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { usersApi } from '../api/endpoints/users';

// Controls how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })
  ).data;
  return token;
}

export async function syncPushToken() {
  const token = await registerForPushNotifications();
  if (!token) return;

  try {
    await usersApi.syncPushToken(token);
  } catch (err) {
    console.warn('Failed to sync push token', err);
  }
}
