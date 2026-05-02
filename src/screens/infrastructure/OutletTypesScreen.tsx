import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useOutletTypes,
  useCreateOutletType,
  useUpdateOutletType,
  useDeleteOutletType,
} from '../../hooks/useOutletTypes';
import { OutletType } from '../../api/endpoints/outletTypes';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';

function TypeFormModal({
  visible,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  initial?: OutletType;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setNameError(null);
      setDescriptionError(null);
    }
  }, [visible, initial]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    let hasError = false;
    if (trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters.');
      hasError = true;
    } else {
      setNameError(null);
    }

    if (trimmedDescription.length < 5) {
      setDescriptionError('Description must be at least 5 characters.');
      hasError = true;
    } else {
      setDescriptionError(null);
    }

    if (hasError) return;
    onSubmit(trimmedName, trimmedDescription);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.createModalRoot}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.createModalScrim}
          onPress={onClose}
        />
        <View style={styles.createSheet}>
          <View style={styles.createSheetTop}>
            <View style={styles.createSheetHandle} />
            <View style={styles.createSheetHeader}>
              <Text style={styles.createSheetTitle}>{initial ? 'Edit Outlet Type' : 'Create Outlet Type'}</Text>
              <TouchableOpacity
                style={styles.createSheetClose}
                onPress={onClose}
                disabled={submitting}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formInner}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, nameError && styles.inputError]}
              placeholder="e.g. Cafe, Bakery"
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (nameError) setNameError(null);
              }}
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput, descriptionError && styles.inputError]}
              placeholder="Brief description..."
              placeholderTextColor={colors.textDisabled}
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                if (descriptionError) setDescriptionError(null);
              }}
              multiline
            />
            {descriptionError ? <Text style={styles.fieldError}>{descriptionError}</Text> : null}

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.submitBtnText}>{initial ? 'Save Changes' : 'Create Type'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function OutletTypesScreen() {
  const { data: types, isLoading, isFetching, refetch } = useOutletTypes();
  const createType = useCreateOutletType();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const updateType = useUpdateOutletType();
  const deleteType = useDeleteOutletType();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OutletType | undefined>();

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

  const renderItem = ({ item }: { item: OutletType }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardBody}>
          <Text style={styles.typeName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.typeDesc} numberOfLines={1} ellipsizeMode="tail">{item.description}</Text>
        </View>
        {isAdmin && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => {
                setEditing(item);
                setShowModal(true);
              }}
              style={[styles.actionBtn, styles.editBtn]}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionBtn, styles.deleteBtn]}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Outlet Types</Text>
          <Text style={styles.subheading}>Manage foundational categories for your outlets</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              setEditing(undefined);
              setShowModal(true);
            }}
          >
            <Text style={styles.createBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={types ?? []}
        extraData={types}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
        ListHeaderComponent={
          isLoading ? <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} /> : null
        }
        renderItem={renderItem}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No outlet types yet</Text> : null
        }
      />

      <TypeFormModal
        visible={showModal}
        initial={editing}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitting={createType.isPending || updateType.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  createBtn: {
    backgroundColor: colors.buttonPrimaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },

  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: 120 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D3C5AC26',
    ...shadow.sm,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  typeName: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  typeDesc: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editBtn: {
    borderColor: '#D3C5AC80',
    backgroundColor: colors.buttonLightBg,
  },
  deleteBtn: {
    borderColor: '#FBCACA',
    backgroundColor: '#FFF1F1',
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xxl,
    fontSize: typography.sm,
  },

  createModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  createModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 28, 30, 0.4)',
  },
  createSheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#191c1e',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 24,
  },
  createSheetTop: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#D3C5AC40',
    backgroundColor: colors.surfaceOverlay,
  },
  createSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#E6E8EA',
    marginBottom: spacing.sm,
  },
  createSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  createSheetTitle: {
    flex: 1,
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  createSheetClose: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F6',
  },
  createSheetCloseText: {
    color: colors.textSecondary,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },

  formInner: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
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
  },
  descriptionInput: {
    height: 108,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    fontSize: typography.xs,
    color: colors.error,
    marginTop: 4,
  },
  formActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D3C5AC80',
    backgroundColor: colors.buttonLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  submitBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  submitBtnText: {
    color: colors.textInverse,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
});
