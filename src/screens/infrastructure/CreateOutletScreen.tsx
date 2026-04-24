import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCreateOutlet, useUpdateOutlet } from '../../hooks/useOutlets';
import { useOutletTypes } from '../../hooks/useOutletTypes';
import { useManagers } from '../../hooks/useUsers';
import { useAuthStore } from '../../store/authStore';
import { Outlet } from '../../api/endpoints/outlets';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { InfrastructureStackParamList } from '../../navigation/InfrastructureNavigator';
import { getApiErrorMessage } from '../../utils/errors';

type Props = NativeStackScreenProps<InfrastructureStackParamList, 'CreateOutlet'>;
type CreateOutletContentProps = {
  mode?: 'create' | 'edit';
  outletToEdit?: Outlet | null;
  onSuccess: () => void;
  submitLabel?: string;
  bottomPadding?: number;
  fill?: boolean;
  backgroundColor?: string;
};

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {text}
      {required && <Text style={{ color: colors.error }}> *</Text>}
    </Text>
  );
}

function PickerModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  multi,
}: {
  visible: boolean;
  title: string;
  items: { id: string; name: string }[];
  selected: string | string[];
  onSelect: (id: string) => void;
  onClose: () => void;
  multi?: boolean;
}) {
  const selectedArr = Array.isArray(selected) ? selected : [selected];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.pickerRoot}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalDone}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const isSelected = selectedArr.includes(item.id);
            return (
              <TouchableOpacity style={styles.pickerRow} onPress={() => onSelect(item.id)}>
                <Text style={styles.pickerName}>{item.name}</Text>
                {isSelected && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

export function CreateOutletContent({
  mode = 'create',
  outletToEdit = null,
  onSuccess,
  submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Outlet',
  bottomPadding = 120,
  fill = true,
  backgroundColor = colors.background,
}: CreateOutletContentProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [outletTypeId, setOutletTypeId] = useState('');
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);

  const {
    data: outletTypes,
    isLoading: isLoadingOutletTypes,
    isError: isOutletTypesError,
    isFetching: isFetchingOutletTypes,
    refetch: refetchOutletTypes,
  } = useOutletTypes();
  const { data: managers } = useManagers();
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const userRole = useAuthStore((state) => state.user?.role);
  const isAdmin = userRole === 'admin';

  React.useEffect(() => {
    if (mode !== 'edit' || !outletToEdit) {
      return;
    }
    setName(outletToEdit.name ?? '');
    setDescription(outletToEdit.description ?? '');
    setAddress(outletToEdit.address ?? '');
    setOutletTypeId(outletToEdit.outletTypeId ?? '');
    setManagerIds(outletToEdit.managerIds ?? []);
  }, [mode, outletToEdit]);

  React.useEffect(() => {
    if (mode !== 'create') return;
    setName('');
    setDescription('');
    setAddress('');
    setOutletTypeId('');
    setManagerIds([]);
  }, [mode]);

  const selectedType = outletTypes?.find((t) => t.id === outletTypeId);
  const selectedManagers = managers?.filter((m) => managerIds.includes(m.id)) ?? [];
  const isSubmitting = createOutlet.isPending || updateOutlet.isPending;

  const handleSubmit = () => {
    if (!isAdmin) {
      return Alert.alert('Permission denied', 'Only admins can create outlets.');
    }
    if (!name.trim()) return Alert.alert('Required', 'Outlet name is required.');
    if (!description.trim()) return Alert.alert('Required', 'Description is required.');
    if (!outletTypeId) return Alert.alert('Required', 'Please select an outlet type.');

    if (mode === 'edit') {
      if (!outletToEdit) return;
      updateOutlet.mutate(
        {
          id: outletToEdit.id,
          payload: {
            name: name.trim(),
            description: description.trim(),
            address: address.trim() || undefined,
            outletType: outletTypeId,
            managerIds,
          },
        },
        {
          onSuccess,
          onError: (error) => Alert.alert('Error', getApiErrorMessage(error, 'Failed to update outlet.')),
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
        ...(managerIds.length > 0 ? { managerIds } : {}),
      },
      {
        onSuccess,
        onError: (error) => Alert.alert('Error', getApiErrorMessage(error, 'Failed to create outlet.')),
      },
    );
  };

  return (
    <View style={[fill ? styles.rootFill : styles.rootAuto, { backgroundColor }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled">
        <Label text="Name" required />
        <TextInput
          style={styles.input}
          placeholder="Outlet name"
          placeholderTextColor={colors.textDisabled}
          value={name}
          onChangeText={setName}
        />

        <Label text="Description" required />
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Describe this outlet..."
          placeholderTextColor={colors.textDisabled}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Label text="Address" />
        <TextInput
          style={styles.input}
          placeholder="Street address"
          placeholderTextColor={colors.textDisabled}
          value={address}
          onChangeText={setAddress}
        />

        <Label text="Outlet Type" required />
        {isLoadingOutletTypes ? (
          <View style={styles.fieldState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isOutletTypesError ? (
          <View style={styles.fieldState}>
            <Text style={styles.fieldError}>Unable to load outlet types.</Text>
            <TouchableOpacity
              style={[styles.retryBtn, isFetchingOutletTypes && styles.retryBtnDisabled]}
              onPress={() => { void refetchOutletTypes(); }}
              disabled={isFetchingOutletTypes}
            >
              {isFetchingOutletTypes ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.retryBtnText}>Retry</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.input} onPress={() => setShowTypePicker(true)}>
            <Text style={{ color: selectedType ? colors.text : colors.textDisabled }}>
              {selectedType?.name ?? 'Select type...'}
            </Text>
          </TouchableOpacity>
        )}

        <Label text="Managers" />
        <TouchableOpacity style={styles.input} onPress={() => setShowManagerPicker(true)}>
          <Text style={{ color: selectedManagers.length > 0 ? colors.text : colors.textDisabled }}>
            {selectedManagers.length > 0 ? selectedManagers.map((m) => m.name).join(', ') : 'Select managers...'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, (isSubmitting || !isAdmin) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting || !isAdmin}
        >
          {isSubmitting
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.submitBtnText}>{submitLabel}</Text>}
        </TouchableOpacity>
        {!isAdmin && (
          <Text style={styles.helperText}>Only admins can create outlets.</Text>
        )}
      </ScrollView>

      <PickerModal
        visible={showTypePicker}
        title="Select Outlet Type"
        items={outletTypes ?? []}
        selected={outletTypeId}
        onSelect={(id) => { setOutletTypeId(id); setShowTypePicker(false); }}
        onClose={() => setShowTypePicker(false)}
      />
      <PickerModal
        visible={showManagerPicker}
        title="Select Managers"
        items={managers ?? []}
        selected={managerIds}
        multi
        onSelect={(id) => setManagerIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        )}
        onClose={() => setShowManagerPicker(false)}
      />
    </View>
  );
}

export default function CreateOutletScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={[styles.rootFill, { backgroundColor: colors.background }]} edges={['bottom']}>
      <CreateOutletContent onSuccess={() => navigation.goBack()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootFill: { flex: 1 },
  rootAuto: {},
  scroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
    marginBottom: 2,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  fieldState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  fieldError: { color: colors.error, fontSize: typography.sm },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnDisabled: { opacity: 0.7 },
  retryBtnText: { color: colors.primary, fontSize: typography.sm, fontWeight: typography.medium },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitBtnText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },
  helperText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.xs,
    textAlign: 'center',
  },
  pickerRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalDone: { color: colors.primary, fontSize: typography.base },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerName: { fontSize: typography.base, color: colors.text },
});
