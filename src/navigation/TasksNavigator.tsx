import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { TaskFilterParams } from '../constants/taskFilters';
import CreateTaskScreen from '../screens/tasks/CreateTaskScreen';
import TaskCategoriesScreen from '../screens/tasks/TaskCategoriesScreen';
import TaskDetailScreen from '../screens/tasks/TaskDetailScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import { colors, typography } from '../theme/theme';

export type TasksStackParamList = {
  TasksList: { initialTaskFilter?: TaskFilterParams } | undefined;
  TaskDetail: { taskId: string };
  CreateTask: undefined;
  TaskCategories: undefined;
};

const Stack = createNativeStackNavigator<TasksStackParamList>();

export default function TasksNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { fontWeight: typography.semibold, color: colors.text },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen name="TasksList" component={TasksScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateTask"
        component={CreateTaskScreen}
        options={{ title: 'New Task', presentation: 'modal' }}
      />
      <Stack.Screen
        name="TaskCategories"
        component={TaskCategoriesScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
