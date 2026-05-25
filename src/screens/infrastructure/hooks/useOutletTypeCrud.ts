import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert } from 'react-native';

import { OutletType } from '../../../api/endpoints/outletTypes';
import {
  useOutletTypes,
  useCreateOutletType,
  useUpdateOutletType,
  useDeleteOutletType,
} from '../../../hooks/infrastructure';
import { InfrastructureStackParamList } from '../../../navigation/InfrastructureNavigator';
import { useAuthStore } from '../../../store/authStore';

export function useOutletTypeCrud() {
  const { data: types, isLoading, isFetching, refetch } = useOutletTypes();
  const createType = useCreateOutletType();
  const updateType = useUpdateOutletType();
  const deleteType = useDeleteOutletType();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const navigation = useNavigation<NativeStackNavigationProp<InfrastructureStackParamList>>();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OutletType | undefined>();

  const isPending = createType.isPending || updateType.isPending || deleteType.isPending;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('OutletsList');
  };

  const handleSubmit = (name: string, description: string) => {
    if (editing) {
      updateType.mutate(
        { id: editing.id, payload: { name, description } },
        {
          onSuccess: () => {
            setShowModal(false);
            Alert.alert('Updated', 'Outlet type updated successfully.');
          },
          onError: () => {
            Alert.alert('Update Failed', 'Unable to update outlet type. Please try again.');
          },
        },
      );
      return;
    }

    createType.mutate(
      { name, description },
      {
        onSuccess: () => {
          setShowModal(false);
          Alert.alert('Created', 'New outlet type created successfully.');
        },
        onError: () => {
          Alert.alert('Create Failed', 'Unable to create outlet type. Please try again.');
        },
      },
    );
  };

  const handleDelete = (type: OutletType) => {
    Alert.alert('Delete Type', `Delete "${type.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteType.mutate(type.id, {
            onError: () => {
              Alert.alert('Delete Failed', 'Unable to delete outlet type. Please try again.');
            },
          }),
      },
    ]);
  };

  return {
    types,
    isLoading,
    isFetching,
    refetch,
    isAdmin,
    isPending,
    showModal,
    setShowModal,
    editing,
    setEditing,
    handleBack,
    handleSubmit,
    handleDelete,
  };
}
