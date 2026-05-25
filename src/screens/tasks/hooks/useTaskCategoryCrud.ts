import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert } from 'react-native';

import { TaskCategoryOption } from '../../../api/endpoints/tasks';
import {
  useTaskCategories,
  useCreateTaskCategory,
  useUpdateTaskCategory,
  useDeleteTaskCategory,
} from '../../../hooks/tasks';
import { TasksStackParamList } from '../../../navigation/TasksNavigator';
import { useAuthStore } from '../../../store/authStore';

export function useTaskCategoryCrud() {
  const { data: categories, isLoading, isFetching, refetch } = useTaskCategories();
  const createCategory = useCreateTaskCategory();
  const updateCategory = useUpdateTaskCategory();
  const deleteCategory = useDeleteTaskCategory();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  const navigation = useNavigation<NativeStackNavigationProp<TasksStackParamList>>();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TaskCategoryOption | undefined>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('TasksList');
  };

  const handleOpenCreate = () => {
    setEditing(undefined);
    setShowModal(true);
  };

  const handleOpenEdit = (category: TaskCategoryOption) => {
    setEditing(category);
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  const handleSubmit = (name: string, description?: string) => {
    if (editing) {
      updateCategory.mutate(
        { id: editing.id, payload: { name, description: description ?? '' } },
        {
          onSuccess: () => {
            setShowModal(false);
            Alert.alert('Updated', 'Task category updated successfully.');
          },
          onError: () => {
            Alert.alert('Update Failed', 'Unable to update task category. Please try again.');
          },
        },
      );
      return;
    }

    createCategory.mutate(
      { name, description },
      {
        onSuccess: () => {
          setShowModal(false);
          Alert.alert('Created', 'New task category created successfully.');
        },
        onError: () => {
          Alert.alert('Create Failed', 'Unable to create task category. Please try again.');
        },
      },
    );
  };

  const handleDelete = (category: TaskCategoryOption) => {
    Alert.alert('Delete Category', `Delete "${category.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteCategory.mutate(category.id, {
            onError: () => {
              Alert.alert('Delete Failed', 'Unable to delete task category. Please try again.');
            },
          }),
      },
    ]);
  };

  const submitting = createCategory.isPending || updateCategory.isPending;

  return {
    categories,
    isLoading,
    isFetching,
    showModal,
    editing,
    isAdmin,
    submitting,
    refetch,
    handleBack,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleSubmit,
    handleDelete,
  };
}
