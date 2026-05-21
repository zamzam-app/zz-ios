import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadow } from '../theme/theme';
import OverviewScreen from '../screens/overview/OverviewScreen';
import TasksNavigator, { TasksStackParamList } from './TasksNavigator';
import ReviewsNavigator, { ReviewsStackParamList } from './ReviewsNavigator';
import MoreNavigator from './MoreNavigator';
import { useReviewBadgeStatus } from '../hooks/useReviews';
import { useAuthStore } from '../store/authStore';
import { getReviewTabBadgeModel } from './reviewBadgeState';
import { useUnreadAggregated } from '../hooks/useTaskView';
import * as Notifications from 'expo-notifications';

export type AppTabParamList = {
  Overview: undefined;
  Tasks: NavigatorScreenParams<TasksStackParamList> | undefined;
  Reviews: NavigatorScreenParams<ReviewsStackParamList> | undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type TabRouteName = keyof AppTabParamList;

const TAB_ICONS: Record<TabRouteName, { outline: IoniconName; filled: IoniconName }> = {
  Overview: { outline: 'speedometer-outline',       filled: 'speedometer' },
  Tasks: { outline: 'document-text-outline',      filled: 'document-text' },
  Reviews: { outline: 'chatbubble-ellipses-outline', filled: 'chatbubble-ellipses' },
  More: { outline: 'menu-outline',             filled: 'menu' },
};

const TAB_LABELS: Record<TabRouteName, string> = {
  Overview: 'Dashboard',
  Tasks: 'Tasks',
  Reviews: 'Reviews',
  More: 'Menu',
};

function ReviewsTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const userId = useAuthStore((state) => state.user?.id ?? state.user?._id);
  const { data: reviewBadgeStatus } = useReviewBadgeStatus(userId);
  const reviewBadge = getReviewTabBadgeModel(reviewBadgeStatus);
  const icons = TAB_ICONS.Reviews;
  return (
    <View>
      <Ionicons name={focused ? icons.filled : icons.outline} size={22} color={color} />
      {reviewBadge.visible && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{reviewBadge.count > 99 ? '99+' : reviewBadge.count}</Text>
        </View>
      )}
    </View>
  );
}

function TasksTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { data: aggregated } = useUnreadAggregated();
  const totalUnread = aggregated?.totalUnread ?? 0;
  const icons = TAB_ICONS.Tasks;

  // Sync aggregated unread count to iOS app icon badge
  React.useEffect(() => {
    void Notifications.setBadgeCountAsync(totalUnread).catch(() => undefined);
  }, [totalUnread]);

  return (
    <View>
      <Ionicons name={focused ? icons.filled : icons.outline} size={22} color={color} />
      {totalUnread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
        </View>
      )}
    </View>
  );
}

function TabIcon({ name, color, focused }: { name: TabRouteName; color: string; focused: boolean }) {
  if (name === 'Reviews') return <ReviewsTabIcon color={color} focused={focused} />;
  if (name === 'Tasks') return <TasksTabIcon color={color} focused={focused} />;
  const icons = TAB_ICONS[name];
  if (!icons) return null;
  return <Ionicons name={focused ? icons.filled : icons.outline} size={22} color={color} />;
}

export default function AppNavigator() {

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabel: TAB_LABELS[route.name as TabRouteName],
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: typography.medium,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 2,
          marginTop: 1,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 14,
          right: 14,
          borderRadius: 24,
          height: 76,
          backgroundColor: colors.tabBarBg,
          borderTopWidth: 0,
          paddingTop: 6,
          paddingBottom: 6,
          ...shadow.lg,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabIcon name={route.name as TabRouteName} color={color} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Tasks" component={TasksNavigator} />
      <Tab.Screen name="Reviews" component={ReviewsNavigator} />
      <Tab.Screen name="More" component={MoreNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: '700',
  },
});
