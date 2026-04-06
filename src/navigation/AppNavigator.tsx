import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { colors, typography } from '../theme/theme';
import OverviewScreen from '../screens/overview/OverviewScreen';
import TasksNavigator from './TasksNavigator';

// Placeholder screens — will be replaced as we build each tab
function PlaceholderScreen({ name }: { name: string }) {
  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.textSecondary }}>{name}</Text></View>;
}
const ReviewsScreen = () => <PlaceholderScreen name="Reviews" />;
const InfrastructureScreen = () => <PlaceholderScreen name="Infrastructure" />;
const MoreScreen = () => <PlaceholderScreen name="More" />;

export type AppTabParamList = {
  Overview: undefined;
  Tasks: undefined;
  Reviews: undefined;
  Infrastructure: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

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
            Reviews: '★',
            Infrastructure: '⌂',
            More: '···',
          };
          return <Text style={{ fontSize: 18, color }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="Overview" component={OverviewScreen} />
      <Tab.Screen name="Tasks" component={TasksNavigator} />
      <Tab.Screen name="Reviews" component={ReviewsScreen} />
      <Tab.Screen name="Infrastructure" component={InfrastructureScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
