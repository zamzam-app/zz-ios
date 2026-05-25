import React, { useState } from 'react';
import { Alert } from 'react-native';

import { Outlet } from '../../../api/endpoints/outlets';
import { useCreateOutlet, useUpdateOutlet, useOutletTypes } from '../../../hooks/infrastructure';
import { useForms } from '../../../hooks/tasks';
import { useManagers } from '../../../hooks/useUsers';
import { useAuthStore } from '../../../store/authStore';
import { getApiErrorMessage } from '../../../utils/errors';

export interface UseOutletFormStateOptions {
  mode?: 'create' | 'edit';
  outletToEdit?: Outlet | null;
  onSuccess: () => void;
}

export function useOutletFormState({
  mode = 'create',
  outletToEdit = null,
  onSuccess,
}: UseOutletFormStateOptions) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [outletTypeId, setOutletTypeId] = useState('');
  const [formId, setFormId] = useState('');
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);

  const {
    data: outletTypes,
    isLoading: isLoadingOutletTypes,
    isError: isOutletTypesError,
    isFetching: isFetchingOutletTypes,
    refetch: refetchOutletTypes,
  } = useOutletTypes();
  const { data: forms } = useForms();
  const { data: managers } = useManagers();
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const userRole = useAuthStore((state) => state.user?.role);
  const isAdmin = userRole === 'admin';

  React.useEffect(() => {
    if (mode !== 'edit' || !outletToEdit) return;
    const nextName = outletToEdit.name ?? '';
    const nextDescription = outletToEdit.description ?? '';
    const nextAddress = outletToEdit.address ?? '';
    const nextOutletTypeId = outletToEdit.outletTypeId ?? '';
    const nextFormId = outletToEdit.formId ?? '';
    const nextManagerIds = outletToEdit.managerIds ?? [];

    queueMicrotask(() => {
      setName(nextName);
      setDescription(nextDescription);
      setAddress(nextAddress);
      setOutletTypeId(nextOutletTypeId);
      setFormId(nextFormId);
      setManagerIds(nextManagerIds);
    });
  }, [mode, outletToEdit]);

  React.useEffect(() => {
    if (mode !== 'create') return;
    queueMicrotask(() => {
      setName('');
      setDescription('');
      setAddress('');
      setOutletTypeId('');
      setFormId('');
      setManagerIds([]);
    });
  }, [mode]);

  const selectedType = outletTypes?.find((t) => t.id === outletTypeId);
  const selectedForm = forms?.find((f) => f.id === formId);
  const selectedManagers = managers?.filter((m) => managerIds.includes(m.id)) ?? [];
  const isSubmitting = createOutlet.isPending || updateOutlet.isPending;

  const toggleManager = (id: string) => {
    setManagerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = () => {
    if (!isAdmin) {
      return Alert.alert('Permission denied', 'Only admins can create outlets.');
    }
    if (!name.trim()) return Alert.alert('Required', 'Outlet name is required.');
    if (!outletTypeId) return Alert.alert('Required', 'Please select an outlet type.');

    if (mode === 'edit') {
      if (!outletToEdit) return;
      updateOutlet.mutate(
        {
          id: outletToEdit.id,
          payload: {
            name: name.trim(),
            description: description.trim(),
            address: address.trim(),
            outletType: outletTypeId,
            formId: formId || null,
            managerIds,
          },
        },
        {
          onSuccess,
          onError: (error) =>
            Alert.alert('Error', getApiErrorMessage(error, 'Failed to update outlet.')),
        },
      );
      return;
    }

    createOutlet.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        images: [],
        address: address.trim() || undefined,
        outletType: outletTypeId,
        ...(formId ? { formId } : {}),
        ...(managerIds.length > 0 ? { managerIds } : {}),
      },
      {
        onSuccess,
        onError: (error) =>
          Alert.alert('Error', getApiErrorMessage(error, 'Failed to create outlet.')),
      },
    );
  };

  return {
    // Form field state
    name,
    setName,
    description,
    setDescription,
    address,
    setAddress,
    outletTypeId,
    setOutletTypeId,
    formId,
    setFormId,
    managerIds,
    setManagerIds,

    // Picker visibility
    showTypePicker,
    setShowTypePicker,
    showFormPicker,
    setShowFormPicker,
    showManagerPicker,
    setShowManagerPicker,

    // Data
    outletTypes,
    forms,
    managers,

    // Loading / error states
    isLoadingOutletTypes,
    isOutletTypesError,
    isFetchingOutletTypes,
    refetchOutletTypes,

    // Derived
    selectedType,
    selectedForm,
    selectedManagers,
    isSubmitting,
    isAdmin,

    // Actions
    toggleManager,
    handleSubmit,
  };
}
