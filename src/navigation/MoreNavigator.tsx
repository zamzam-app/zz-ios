import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreScreen from '../screens/more/MoreScreen';
import SettingsScreen from '../screens/more/SettingsScreen';
import ManagersScreen from '../screens/more/ManagersScreen';
import StudioScreen from '../screens/more/StudioScreen';
import FormBuilderScreen from '../screens/more/FormBuilderScreen';
import { colors, typography } from '../theme/theme';

export type MoreStackParamList = {
  MoreMenu: undefined;
  Settings: undefined;
  Managers: undefined;
  Studio: undefined;
  FormBuilder: undefined;
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
      <Stack.Screen name="Studio" component={StudioScreen} options={{ title: 'Studio' }} />
      <Stack.Screen name="FormBuilder" component={FormBuilderScreen} options={{ title: 'Form Builder' }} />
    </Stack.Navigator>
  );
}
