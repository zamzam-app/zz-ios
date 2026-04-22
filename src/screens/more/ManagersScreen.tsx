import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Switch,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useManagers, useUpdateManager, useCreateManager, useDeleteManager } from '../../hooks/useUsers';
import { User } from '../../api/endpoints/users';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import type { MoreStackParamList } from '../../navigation/MoreNavigator';
import { useAuthStore } from '../../store/authStore';

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'M';
}

function ManagerRow({
  manager,
  onToggle,
  onDelete,
  isMutating,
  canDelete,
}: {
  manager: User;
  onToggle: (manager: User, next: boolean) => void;
  onDelete: (manager: User) => void;
  isMutating: boolean;
  canDelete: boolean;
}) {
  const isActive = manager.isActive ?? true;

  return (
    <View style={styles.managerRow}>
      <View style={styles.rowLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(manager.name)}</Text>
        </View>

        <View style={styles.identityWrap}>
          <Text style={styles.managerName} numberOfLines={1}>{manager.name}</Text>
          <Text style={styles.managerEmail} numberOfLines={1}>{manager.email}</Text>
        </View>
      </View>

      <View style={styles.rowRight}>
        <Switch
          value={isActive}
          disabled={isMutating}
          onValueChange={(next) => onToggle(manager, next)}
          trackColor={{ false: '#D6D3D1', true: colors.primaryLight }}
          thumbColor={colors.surface}
          ios_backgroundColor="#D6D3D1"
        />
        {canDelete ? (
          <TouchableOpacity
            onPress={() => onDelete(manager)}
            disabled={isMutating}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function ManagersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const { data: managers, isLoading, isFetching, refetch } = useManagers();
  const updateManager = useUpdateManager();
  const createManager = useCreateManager();
  const deleteManager = useDeleteManager();

  const [query, setQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const filteredManagers = useMemo(() => {
    const source = managers ?? [];
    const term = query.trim().toLowerCase();

    if (!term) return source;

    return source.filter((manager) => {
      const haystack = [manager.name, manager.email, manager.phoneNumber, manager.userName]
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

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MoreMenu');
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewEmail('');
    setNewUserName('');
    setNewPhone('');
    setNewPassword('');
  };

  const handleCreateManager = () => {
    const name = newName.trim();
    const email = newEmail.trim();
    const userName = newUserName.trim();
    const password = newPassword.trim();
    const phoneNumber = newPhone.trim();

    if (!name || !email || !userName || !password) {
      Alert.alert('Required', 'Name, email, username, and password are required.');
      return;
    }

    createManager.mutate(
      {
        name,
        email,
        userName,
        password,
        role: 'manager',
        phoneNumber: phoneNumber || undefined,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          resetCreateForm();
          Alert.alert('Done', 'Manager created successfully.');
        },
        onError: () => Alert.alert('Error', 'Failed to create manager.'),
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

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Managers Directory</Text>
          </View>
          <Text style={styles.subtitle}>High-density administrative control panel</Text>
          {isAdmin ? (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createBtnText}>+ New Manager</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Search managers..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.listShell}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Active Profiles</Text>
            <View style={styles.totalChip}>
              <Text style={styles.totalChipText}>{totalCount} TOTAL</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={filteredManagers}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              onRefresh={refetch}
              refreshing={isFetching && !isLoading}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <ManagerRow
                  manager={item}
                  onToggle={handleToggleActive}
                  onDelete={handleDeleteManager}
                  isMutating={updateManager.isPending || deleteManager.isPending}
                  canDelete={isAdmin}
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No managers found.</Text>}
            />
          )}
        </View>
      </View>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.modalRoot}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.modalHeaderCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Manager</Text>
              <TouchableOpacity onPress={handleCreateManager} disabled={createManager.isPending}>
                {createManager.isPending ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.modalHeaderSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formWrap}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Manager name"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="name@example.com"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                value={newUserName}
                onChangeText={setNewUserName}
                placeholder="username"
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="Optional"
                placeholderTextColor={colors.textDisabled}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Temporary Password *</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 4 characters"
                placeholderTextColor={colors.textDisabled}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.primary,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subtitle: {
    marginTop: 2,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  createBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.buttonPrimaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  searchWrap: {
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  searchInput: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 38,
    paddingRight: spacing.md,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  listShell: {
    flex: 1,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F4F6',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listTitle: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  totalChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTintStrong,
  },
  totalChipText: {
    fontSize: 10,
    fontWeight: typography.bold,
    color: colors.primaryDark,
    letterSpacing: 0.3,
  },
  loader: {
    marginTop: spacing.xl,
  },
  listContent: {
    paddingBottom: 120,
  },
  managerRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  identityWrap: {
    flex: 1,
    marginLeft: spacing.sm,
    gap: 2,
  },
  managerName: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  managerEmail: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontSize: typography.sm,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.md,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  modalHeaderCancel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  modalHeaderSave: {
    color: colors.primary,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  formWrap: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
