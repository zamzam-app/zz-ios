import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { User, UpdateManagerPayload } from '../../../../api/endpoints/users';
import {
  useManagers,
  useUpdateManager,
  useCreateManager,
  useDeleteManager,
} from '../../../../hooks/useUsers';

export function useManagersState() {
  const { data: managers, isLoading, isFetching, refetch } = useManagers();
  const updateManager = useUpdateManager();
  const createManager = useCreateManager();
  const deleteManager = useDeleteManager();

  const [query, setQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingManager, setEditingManager] = useState<User | null>(null);
  const [newName, setNewName] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const filteredManagers = useMemo(() => {
    const source = (managers as User[]) ?? [];
    const term = query.trim().toLowerCase();

    if (!term) return source;

    return source.filter((manager: User) => {
      const haystack = [manager.name, manager.phoneNumber, manager.userName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [managers, query]);

  const totalCount = managers?.length ?? 0;

  const handleToggleActive = (manager: User, next: boolean) => {
    updateManager.mutate({
      id: manager.id,
      payload: { isActive: next },
    });
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewUserName('');
    setNewPhone('');
    setNewPassword('');
  };

  const openCreateModal = () => {
    setEditingManager(null);
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openEditModal = (manager: User) => {
    setEditingManager(manager);
    setNewName(manager.name ?? '');
    setNewUserName(manager.userName ?? '');
    setNewPhone(manager.phoneNumber ?? '');
    setNewPassword('');
    setShowCreateModal(true);
  };

  const closeManagerModal = () => {
    setShowCreateModal(false);
    setEditingManager(null);
    resetCreateForm();
  };

  const name = newName.trim();
  const userName = newUserName.trim();
  const phoneNumber = newPhone.trim();
  const password = newPassword.trim();
  const isEditMode = Boolean(editingManager);

  const hasRequiredCreateFields = Boolean(name && userName && password);
  const hasRequiredEditFields = Boolean(name && userName);

  const hasEditChanges = useMemo(() => {
    if (!editingManager) return false;
    return (
      name !== (editingManager.name ?? '').trim() ||
      userName !== (editingManager.userName ?? '').trim() ||
      phoneNumber !== (editingManager.phoneNumber ?? '').trim()
    );
  }, [editingManager, name, userName, phoneNumber]);

  const canSaveManager = isEditMode
    ? hasRequiredEditFields && hasEditChanges && !updateManager.isPending
    : hasRequiredCreateFields && !createManager.isPending;

  const handleCreateManager = () => {
    if (!name || !userName || !password) {
      Alert.alert('Required', 'Name, username, and password are required.');
      return;
    }

    createManager.mutate(
      {
        name,
        userName,
        password,
        role: 'manager',
        phoneNumber: phoneNumber || undefined,
      },
      {
        onSuccess: () => {
          closeManagerModal();
          Alert.alert('Done', 'Manager created successfully.');
        },
        onError: () => Alert.alert('Error', 'Failed to create manager.'),
      },
    );
  };

  const handleUpdateManager = () => {
    if (!editingManager) return;
    if (!name || !userName) {
      Alert.alert('Required', 'Name and username are required.');
      return;
    }
    if (!hasEditChanges) return;

    const payload: UpdateManagerPayload = {};
    if (name !== (editingManager.name ?? '').trim()) payload.name = name;
    if (userName !== (editingManager.userName ?? '').trim()) payload.userName = userName;
    if (phoneNumber !== (editingManager.phoneNumber ?? '').trim())
      payload.phoneNumber = phoneNumber || undefined;

    updateManager.mutate(
      { id: editingManager.id, payload },
      {
        onSuccess: () => {
          closeManagerModal();
          Alert.alert('Done', 'Manager updated successfully.');
        },
        onError: () => Alert.alert('Error', 'Failed to update manager.'),
      },
    );
  };

  const handleDeleteManager = (manager: User) => {
    Alert.alert('Delete Manager', `Delete "${manager.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteManager.mutate(manager.id, {
            onError: () => Alert.alert('Error', 'Failed to delete manager.'),
          });
        },
      },
    ]);
  };

  return {
    managers: managers as User[] | undefined,
    filteredManagers,
    isLoading,
    isFetching,
    refetch,
    query,
    setQuery,
    showCreateModal,
    editingManager,
    newName,
    setNewName,
    newUserName,
    setNewUserName,
    newPhone,
    setNewPhone,
    newPassword,
    setNewPassword,
    isEditMode,
    totalCount,
    canSaveManager,
    openCreateModal,
    openEditModal,
    closeManagerModal,
    handleToggleActive,
    handleCreateManager,
    handleUpdateManager,
    handleDeleteManager,
    isMutating: updateManager.isPending || deleteManager.isPending,
    isCreating: createManager.isPending,
    isUpdating: updateManager.isPending,
  };
}
