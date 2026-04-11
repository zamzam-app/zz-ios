import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManagers, useCreateManager, useUpdateManager, useDeleteManager } from '../../hooks/useUsers';
import { User } from '../../api/endpoints/users';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

interface ManagerFormProps {
  visible: boolean;
  initial?: User;
  onClose: () => void;
  onSubmit: (data: {
    name: string; userName: string; email: string; phoneNumber: string; password: string;
  }) => void;
  submitting: boolean;
}

function ManagerFormModal({ visible, initial, onClose, onSubmit, submitting }: ManagerFormProps) {
  const [name, setName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setUserName(initial?.userName ?? '');
      setEmail(initial?.email ?? '');
      setPhoneNumber(initial?.phoneNumber ?? '');
      setPassword('');
    }
  }, [visible, initial]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{initial ? 'Edit Manager' : 'New Manager'}</Text>
            <TouchableOpacity onPress={() => onSubmit({ name, userName, email, phoneNumber, password })} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={{ color: colors.primary, fontWeight: typography.semibold }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formInner} keyboardShouldPersistTaps="handled">
            <Field label="Name *" value={name} onChange={setName} placeholder="Full name" />
            <Field label="Username *" value={userName} onChange={setUserName} placeholder="username" autoCapitalize="none" />
            <Field label="Email *" value={email} onChange={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone" value={phoneNumber} onChange={setPhoneNumber} placeholder="+1234567890" keyboardType="phone-pad" />
            <Field label={initial ? 'New Password (leave blank to keep)' : 'Password *'} value={password} onChange={setPassword} placeholder="••••••••" secureTextEntry />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value, onChange, placeholder, secureTextEntry, keyboardType, autoCapitalize }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; secureTextEntry?: boolean;
  keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </View>
  );
}

export default function ManagersScreen() {
  const { data: managers, isLoading, isFetching, refetch } = useManagers();
  const createManager = useCreateManager();
  const updateManager = useUpdateManager();
  const deleteManager = useDeleteManager();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | undefined>();

  const handleSubmit = (data: { name: string; userName: string; email: string; phoneNumber: string; password: string }) => {
    if (!data.name.trim()) return Alert.alert('Required', 'Name is required.');
    if (!data.userName.trim()) return Alert.alert('Required', 'Username is required.');
    if (!data.email.trim()) return Alert.alert('Required', 'Email is required.');
    if (!editing && !data.password) return Alert.alert('Required', 'Password is required for new managers.');

    if (editing) {
      const payload: any = {
        name: data.name.trim(),
        userName: data.userName.trim(),
        email: data.email.trim(),
        phoneNumber: data.phoneNumber.trim() || undefined,
      };
      if (data.password) payload.password = data.password;
      updateManager.mutate(
        { id: editing.id, payload },
        { onSuccess: () => setShowModal(false), onError: () => Alert.alert('Error', 'Failed to update manager.') },
      );
    } else {
      createManager.mutate(
        {
          name: data.name.trim(),
          userName: data.userName.trim(),
          email: data.email.trim(),
          role: 'manager',
          phoneNumber: data.phoneNumber.trim() || undefined,
          password: data.password,
        },
        { onSuccess: () => setShowModal(false), onError: () => Alert.alert('Error', 'Failed to create manager.') },
      );
    }
  };

  const handleDelete = (manager: User) => {
    Alert.alert('Delete Manager', `Remove "${manager.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteManager.mutate(manager.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <FlatList
        data={managers ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
        ListHeaderComponent={isLoading ? <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} /> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.managerName}>{item.name}</Text>
                <Text style={styles.managerEmail}>{item.email}</Text>
                {item.phoneNumber && <Text style={styles.managerPhone}>{item.phoneNumber}</Text>}
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => { setEditing(item); setShowModal(true); }} style={styles.actionBtn}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Text style={styles.deleteText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No managers yet</Text> : null}
      />

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={() => { setEditing(undefined); setShowModal(true); }}>
          <Text style={styles.fabText}>+ Add Manager</Text>
        </TouchableOpacity>
      </View>

      <ManagerFormModal
        visible={showModal}
        initial={editing}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitting={createManager.isPending || updateManager.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', ...shadow.sm },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.primary, fontWeight: typography.bold, fontSize: typography.base },
  managerName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  managerEmail: { fontSize: typography.sm, color: colors.textSecondary },
  managerPhone: { fontSize: typography.xs, color: colors.textSecondary },
  cardActions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { padding: spacing.xs },
  editText: { color: colors.primary, fontSize: typography.sm, fontWeight: typography.medium },
  deleteText: { color: colors.error, fontSize: typography.sm, fontWeight: typography.medium },
  fab: { position: 'absolute', bottom: spacing.xl, left: spacing.md, right: spacing.md },
  fabBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  fabText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text },
  formInner: { padding: spacing.md, gap: spacing.md },
  label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: typography.base, color: colors.text, backgroundColor: colors.surface },
});
