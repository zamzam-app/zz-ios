import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadow } from '../theme/theme';
import OverviewScreen from '../screens/overview/OverviewScreen';
import TasksNavigator, { TasksStackParamList } from './TasksNavigator';
import ReviewsNavigator from './ReviewsNavigator';
import InfrastructureNavigator from './InfrastructureNavigator';
import MoreNavigator from './MoreNavigator';
import { useReviews } from '../hooks/useReviews';

export type AppTabParamList = {
  Overview: undefined;
  Tasks: NavigatorScreenParams<TasksStackParamList> | undefined;
  Reviews: undefined;
  Infrastructure: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type TabRouteName = keyof AppTabParamList;

const TAB_ICONS: Record<TabRouteName, { outline: IoniconName; filled: IoniconName }> = {
  Overview: { outline: 'speedometer-outline',       filled: 'speedometer' },
  Tasks: { outline: 'document-text-outline',      filled: 'document-text' },
  Reviews: { outline: 'chatbubble-ellipses-outline', filled: 'chatbubble-ellipses' },
  Infrastructure: { outline: 'storefront-outline',       filled: 'storefront' },
  More: { outline: 'menu-outline',             filled: 'menu' },
};

const TAB_LABELS: Record<TabRouteName, string> = {
  Overview: 'Dashboard',
  Tasks: 'Tasks',
  Reviews: 'Reviews',
  Infrastructure: 'Outlets',
  More: 'Menu',
};

function ReviewsTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { data: reviews } = useReviews({ limit: 100 });
  const pendingCount =
    reviews?.filter((r) => r.isComplaint && r.complaintStatus === 'pending').length ?? 0;
  const icons = TAB_ICONS.Reviews;
  return (
    <View>
      <Ionicons name={focused ? icons.filled : icons.outline} size={22} color={color} />
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
        </View>
      )}
    </View>
  );
}

function TabIcon({ name, color, focused }: { name: TabRouteName; color: string; focused: boolean }) {
  if (name === 'Reviews') return <ReviewsTabIcon color={color} focused={focused} />;
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
      <Tab.Screen name="Infrastructure" component={InfrastructureNavigator} />
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
