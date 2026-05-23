import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

import { TaskCategoryOption } from '../../api/endpoints/tasks';
import {
  useTaskCategories,
  useCreateTaskCategory,
  useUpdateTaskCategory,
  useDeleteTaskCategory,
} from '../../hooks/tasks';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

function CategoryFormModal({
  visible,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  initial?: TaskCategoryOption;
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
      const nextName = initial?.name ?? '';
      const nextDescription = initial?.description ?? '';
      queueMicrotask(() => {
        setName(nextName);
        setDescription(nextDescription);
        setNameError(null);
        setDescriptionError(null);
      });
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.createModalRoot}>
        <TouchableOpacity activeOpacity={1} style={styles.createModalScrim} onPress={onClose} />
        <View style={styles.createSheet}>
          <View style={styles.createSheetTop}>
            <View style={styles.createSheetHandle} />
            <View style={styles.createSheetHeader}>
              <Text style={styles.createSheetTitle}>
                {initial ? 'Edit Category' : 'Create Category'}
              </Text>
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
              placeholder="e.g. Cleaning, Maintenance"
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
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
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
                  <Text style={styles.submitBtnText}>
                    {initial ? 'Save Changes' : 'Create Category'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TaskCategoriesScreen() {
  const { data: categories, isLoading, isFetching, refetch } = useTaskCategories();
  const createCategory = useCreateTaskCategory();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const updateCategory = useUpdateTaskCategory();
  const deleteCategory = useDeleteTaskCategory();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TaskCategoryOption | undefined>();
  const navigation = useNavigation<NativeStackNavigationProp<TasksStackParamList>>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('TasksList');
  };

  const handleSubmit = (name: string, description: string) => {
    if (editing) {
      updateCategory.mutate(
        { id: editing.id, payload: { name, description } },
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

  const renderItem = ({ item }: { item: TaskCategoryOption }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardBody}>
          <Text style={styles.typeName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.typeDesc} numberOfLines={1} ellipsizeMode="tail">
            {item.description}
          </Text>
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
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={[styles.actionBtn, styles.deleteBtn]}
            >
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
        <View style={styles.headingWrap}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.heading}>Task Categories</Text>
          </View>
          <Text style={styles.subheading}>Manage foundational categories for your tasks</Text>
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
        data={categories ?? []}
        extraData={categories}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
        }
        ListHeaderComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : null
        }
        renderItem={renderItem}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No task categories yet</Text> : null
        }
      />

      <CategoryFormModal
        visible={showModal}
        initial={editing}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitting={createCategory.isPending || updateCategory.isPending}
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
    gap: spacing.sm,
  },
  headingWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: -spacing.xs,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha16,
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
    borderColor: colors.warmBorderAlpha50,
    backgroundColor: colors.buttonLightBg,
  },
  deleteBtn: {
    borderColor: colors.accentRedBorderSoft,
    backgroundColor: colors.accentRoseBgSoft,
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
    backgroundColor: colors.scrimDark40,
  },
  createSheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: colors.ink,
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
    borderBottomColor: colors.warmBorderAlpha25,
    backgroundColor: colors.surfaceOverlay,
  },
  createSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.uiGray4,
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
    backgroundColor: colors.uiGray1,
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
    borderColor: colors.warmBorderAlpha50,
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
