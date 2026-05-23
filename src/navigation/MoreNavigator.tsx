import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import type { CustomCake, UploadedCakeImage } from '../api/endpoints/uploads';
import FormBuilderScreen from '../screens/more/FormBuilderScreen';
import ManagersScreen from '../screens/more/ManagersScreen';
import MoreScreen from '../screens/more/MoreScreen';
import SettingsScreen from '../screens/more/SettingsScreen';
import StudioDocumentDetailScreen from '../screens/more/StudioDocumentDetailScreen';
import StudioScreen from '../screens/more/StudioScreen';
import { colors, typography } from '../theme/theme';

import InfrastructureNavigator from './InfrastructureNavigator';

export type MoreStackParamList = {
  MoreMenu: undefined;
  Settings: undefined;
  Managers: undefined;
  Studio: undefined;
  StudioDocumentDetail: {
    type: 'custom-cake' | 'uploaded-cake';
    item: CustomCake | UploadedCakeImage;
  };
  FormBuilder: undefined;
  Infrastructure: undefined;
};

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: typography.semibold, color: colors.text },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="MoreMenu" component={MoreScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Managers" component={ManagersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Studio" component={StudioScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="StudioDocumentDetail"
        component={StudioDocumentDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FormBuilder"
        component={FormBuilderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Infrastructure"
        component={InfrastructureNavigator}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
