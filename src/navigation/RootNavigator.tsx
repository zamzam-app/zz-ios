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

  useEffect(() => {
    restoreSession();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      console.log('Notification tapped:', data);

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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
