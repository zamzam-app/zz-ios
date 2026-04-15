import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadow } from '../theme/theme';
import OverviewScreen from '../screens/overview/OverviewScreen';
import TasksNavigator from './TasksNavigator';
import ReviewsNavigator from './ReviewsNavigator';
import InfrastructureNavigator from './InfrastructureNavigator';
import MoreNavigator from './MoreNavigator';
import { useReviews } from '../hooks/useReviews';

export type AppTabParamList = {
  Overview: undefined;
  Tasks: undefined;
  Reviews: undefined;
  Infrastructure: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { outline: IoniconName; filled: IoniconName }> = {
  Overview:       { outline: 'grid-outline',       filled: 'grid' },
  Tasks:          { outline: 'checkbox-outline',   filled: 'checkbox' },
  Reviews:        { outline: 'star-outline',        filled: 'star' },
  Infrastructure: { outline: 'storefront-outline', filled: 'storefront' },
  More:           { outline: 'menu-outline',        filled: 'menu' },
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

function TabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: typography.xs,
          fontWeight: typography.medium,
          marginBottom: 6,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          borderRadius: 32,
          height: 72,
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopWidth: 0,
          paddingTop: 8,
          ...shadow.lg,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabIcon name={route.name} color={color} focused={focused} />
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
    top: -4,
    right: -8,
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
