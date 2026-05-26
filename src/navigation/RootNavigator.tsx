import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/theme';

import AppNavigator, { AppTabParamList } from './AppNavigator';
import AuthNavigator from './AuthNavigator';

export default function RootNavigator() {
  const { user, isLoading, restoreSession } = useAuthStore();
  const navigationRef = useNavigationContainerRef<AppTabParamList>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const pendingNotificationData = useRef<unknown | null>(null);
  const userRef = useRef(user);
  const isLoadingRef = useRef(isLoading);

  type NotificationNavData =
    | { type: 'task'; taskId: string }
    | { type: 'complaint'; reviewId: string };

  const parseNotificationNavData = useCallback((value: unknown): NotificationNavData | null => {
    if (!value || typeof value !== 'object') return null;
    const data = value as Record<string, unknown>;
    if (data.type === 'task' && typeof data.taskId === 'string') {
      return { type: 'task', taskId: data.taskId };
    }
    if (data.type === 'complaint' && typeof data.reviewId === 'string') {
      return { type: 'complaint', reviewId: data.reviewId };
    }
    return null;
  }, []);

  const navigateFromNotificationData = useCallback(
    (dataValue: unknown) => {
      const data = parseNotificationNavData(dataValue);
      if (!data) return;

      if (data.type === 'task' && data.taskId) {
        navigationRef.navigate('Tasks', {
          screen: 'TaskDetail',
          params: { taskId: data.taskId },
        });
      } else if (data.type === 'complaint' && data.reviewId) {
        navigationRef.navigate('Reviews', {
          screen: 'ReviewDetail',
          params: { reviewId: data.reviewId },
        });
      }
    },
    [navigationRef, parseNotificationNavData],
  );

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as unknown;
      if (__DEV__) console.warn('Notification tapped:', data);

      // On cold start this can fire before auth restore + navigator mount.
      if (!navigationRef.isReady() || isLoadingRef.current || !userRef.current) {
        pendingNotificationData.current = data;
        return;
      }

      navigateFromNotificationData(data);
    },
    [navigationRef, navigateFromNotificationData],
  );

  const flushPendingNotificationNavigation = useCallback(() => {
    if (!pendingNotificationData.current) return;
    if (!navigationRef.isReady() || isLoading || !user) return;

    const data = pendingNotificationData.current;
    pendingNotificationData.current = null;
    navigateFromNotificationData(data);
  }, [isLoading, navigationRef, navigateFromNotificationData, user]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      if (__DEV__) console.warn('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    Notifications.getLastNotificationResponseAsync().then((lastResponse) => {
      if (lastResponse) {
        handleNotificationResponse(lastResponse);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationResponse]);

  useEffect(() => {
    flushPendingNotificationNavigation();
  }, [flushPendingNotificationNavigation]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNotificationNavigation}>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
