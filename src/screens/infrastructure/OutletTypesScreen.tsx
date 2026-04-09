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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useOutletTypes,
  useCreateOutletType,
  useUpdateOutletType,
  useDeleteOutletType,
} from '../../hooks/useOutletTypes';
import { OutletType } from '../../api/endpoints/outletTypes';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

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

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
    }
  }, [visible, initial]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.base }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{initial ? 'Edit Type' : 'New Type'}</Text>
            <TouchableOpacity onPress={() => onSubmit(name, description)} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={{ color: colors.primary, fontSize: typography.base, fontWeight: typography.semibold }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.formInner}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cafe, Bakery"
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Brief description..."
              placeholderTextColor={colors.textDisabled}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function OutletTypesScreen() {
  const { data: types, isLoading, isFetching, refetch } = useOutletTypes();
  const createType = useCreateOutletType();
  const updateType = useUpdateOutletType();
  const deleteType = useDeleteOutletType();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OutletType | undefined>();

  const handleSubmit = (name: string, description: string) => {
    if (!name.trim()) return Alert.alert('Required', 'Name is required.');
    if (!description.trim()) return Alert.alert('Required', 'Description is required.');

    if (editing) {
      updateType.mutate(
        { id: editing.id, payload: { name: name.trim(), description: description.trim() } },
        { onSuccess: () => setShowModal(false) },
      );
    } else {
      createType.mutate(
        { name: name.trim(), description: description.trim() },
        { onSuccess: () => setShowModal(false) },
      );
    }
  };

  const handleDelete = (type: OutletType) => {
    Alert.alert('Delete Type', `Delete "${type.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteType.mutate(type.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <FlatList
        data={types ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
        ListHeaderComponent={
          isLoading ? <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} /> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.typeName}>{item.name}</Text>
              <Text style={styles.typeDesc} numberOfLines={2}>{item.description}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => { setEditing(item); setShowModal(true); }}
                style={styles.actionBtn}
              >
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No outlet types yet</Text> : null
        }
      />

      <View style={styles.fab}>
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={() => { setEditing(undefined); setShowModal(true); }}
        >
          <Text style={styles.fabText}>+ Add Type</Text>
        </TouchableOpacity>
      </View>

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
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow.sm,
  },
  cardBody: { flex: 1 },
  typeName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  typeDesc: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  editText: { color: colors.primary, fontSize: typography.sm, fontWeight: typography.medium },
  deleteText: { color: colors.error, fontSize: typography.sm, fontWeight: typography.medium },

  fab: { position: 'absolute', bottom: spacing.xl, left: spacing.md, right: spacing.md },
  fabBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  fabText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },

  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text },
  formInner: { padding: spacing.md, gap: spacing.sm },
  label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.text },
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
});
