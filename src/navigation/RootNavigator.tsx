import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import AppNavigator, { AppTabParamList } from './AppNavigator';
import { colors } from '../theme/theme';

export default function RootNavigator() {
  const { user, isLoading, restoreSession } = useAuthStore();
  const navigationRef = useNavigationContainerRef<AppTabParamList>();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const pendingNotificationData = useRef<any | null>(null);

  const navigateFromNotificationData = (data: any) => {
    if (!data) return;

    if (data.type === 'task' && data.taskId) {
      navigationRef.navigate('Tasks', {
        screen: 'TaskDetail',
        params: { taskId: data.taskId }
      });
    } else if (data.type === 'complaint' && data.reviewId) {
      navigationRef.navigate('Reviews', {
        screen: 'ReviewDetail',
        params: { reviewId: data.reviewId }
      });
    }
  };

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data as any;
    console.log('Notification tapped:', data);

    // On cold start this can fire before auth restore + navigator mount.
    if (!navigationRef.isReady() || isLoading || !user) {
      pendingNotificationData.current = data;
      return;
    }

    navigateFromNotificationData(data);
  };

  const flushPendingNotificationNavigation = () => {
    if (!pendingNotificationData.current) return;
    if (!navigationRef.isReady() || isLoading || !user) return;

    const data = pendingNotificationData.current;
    pendingNotificationData.current = null;
    navigateFromNotificationData(data);
  };

  useEffect(() => {
    restoreSession();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    Notifications.getLastNotificationResponseAsync().then(lastResponse => {
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
  }, []);

  useEffect(() => {
    flushPendingNotificationNavigation();
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushPendingNotificationNavigation}
    >
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
