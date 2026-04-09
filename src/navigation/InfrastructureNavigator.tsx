import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InfrastructureScreen from '../screens/infrastructure/InfrastructureScreen';
import OutletDetailScreen from '../screens/infrastructure/OutletDetailScreen';
import CreateOutletScreen from '../screens/infrastructure/CreateOutletScreen';
import OutletTypesScreen from '../screens/infrastructure/OutletTypesScreen';
import { colors, typography } from '../theme/theme';

export type InfrastructureStackParamList = {
  OutletsList: undefined;
  OutletDetail: { outletId: string };
  CreateOutlet: undefined;
  OutletTypes: undefined;
};

const Stack = createNativeStackNavigator<InfrastructureStackParamList>();

export default function InfrastructureNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: typography.semibold, color: colors.text },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="OutletsList" component={InfrastructureScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OutletDetail" component={OutletDetailScreen} options={{ title: 'Outlet Detail' }} />
      <Stack.Screen name="CreateOutlet" component={CreateOutletScreen} options={{ title: 'New Outlet', presentation: 'modal' }} />
      <Stack.Screen name="OutletTypes" component={OutletTypesScreen} options={{ title: 'Outlet Types' }} />
    </Stack.Navigator>
  );
}
