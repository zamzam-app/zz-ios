import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { colors, typography } from '../theme/theme';
import OverviewScreen from '../screens/overview/OverviewScreen';
import TasksNavigator from './TasksNavigator';
import ReviewsNavigator from './ReviewsNavigator';
import InfrastructureNavigator from './InfrastructureNavigator';
import MoreNavigator from './MoreNavigator';
import { useReviews } from '../hooks/useReviews';

// Placeholder screens — will be replaced as we build each tab
function PlaceholderScreen({ name }: { name: string }) {
  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.textSecondary }}>{name}</Text></View>;
}

export type AppTabParamList = {
  Overview: undefined;
  Tasks: undefined;
  Reviews: undefined;
  Infrastructure: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

function ReviewsTabIcon({ color }: { color: string }) {
  const { data: reviews } = useReviews({ limit: 100 });
  const pendingCount = reviews?.filter((r) => r.isComplaint && r.complaintStatus === 'pending').length ?? 0;

  return (
    <View>
      <Text style={{ fontSize: 18, color }}>★</Text>
      {pendingCount > 0 && (
        <View style={{
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
        }}>
          <Text style={{ color: colors.textInverse, fontSize: 9, fontWeight: '700' }}>
            {pendingCount > 99 ? '99+' : pendingCount}
          </Text>
        </View>
      )}
    </View>
  );
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
        },
        tabBarStyle: {
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color }) => {
          const icons: Record<string, string> = {
            Overview: '⊞',
            Tasks: '✓',
            Infrastructure: '⌂',
            More: '···',
          };
          if (route.name === 'Reviews') return <ReviewsTabIcon color={color} />;
          return <Text style={{ fontSize: 18, color }}>{icons[route.name]}</Text>;
        },
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
