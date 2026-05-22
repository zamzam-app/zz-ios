import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUsers } from '../hooks/useUsers';
import { useDelegateTask } from '../hooks/useTaskDelegation';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';
import type { User } from '../api/endpoints/users';

interface DelegationSheetProps {
  visible: boolean;
  onClose: () => void;
  taskId: string;
  /** Description of the task, shown in the sheet header for context */
  taskDescription?: string;
  /** User IDs to exclude from the list (already attached / current user) */
  excludeUserIds?: string[];
  /** Outlet ID associated with the task, if any */
  outletId?: string | any;
}

function UserRow({
  user,
  isSelected,
  onPress,
}: {
  user: User;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.userRow, isSelected && styles.userRowSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Select ${user.name}`}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userRole}>{user.role}</Text>
      </View>
      {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
    </TouchableOpacity>
  );
}

export default function DelegationSheet({
  visible,
  onClose,
  taskId,
  taskDescription,
  excludeUserIds,
  outletId,
}: DelegationSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Reset internal state when sheet opens
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedUserId(null);
    setNote('');
    onClose();
  }, [onClose]);

  const { data: users, isLoading: usersLoading } = useUsers();
  const delegateMutation = useDelegateTask();

  const isPending = delegateMutation.isPending;
  const mutationError = delegateMutation.error;

  const filteredUsers = useMemo(() => {
    if (!users) return [];

    // Filter to only include manager / admin
    let result = users.filter(
      (u) => u.role?.toLowerCase() === 'manager' || u.role?.toLowerCase() === 'admin',
    );

    // If task has an outlet, only include users associated with that outlet
    let targetOutletId: string | undefined;
    if (outletId) {
      if (typeof outletId === 'string') {
        targetOutletId = outletId;
      } else if (typeof outletId === 'object') {
        targetOutletId = outletId._id ?? outletId.id;
      }
    }

    if (targetOutletId) {
      result = result.filter((u) => u.outlets?.includes(targetOutletId!));
    }

    // Filter out already attached people & current user
    if (excludeUserIds && excludeUserIds.length > 0) {
      result = result.filter((u) => !excludeUserIds.includes(u.id));
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return result;
    return result.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query),
    );
  }, [users, searchQuery, excludeUserIds, outletId]);

  const handleConfirm = useCallback(() => {
    if (!selectedUserId) return;

    delegateMutation.mutate(
      { taskId, payload: { delegatedTo: selectedUserId, note: note.trim() || undefined } },
      { onSuccess: handleClose },
    );
  }, [selectedUserId, note, taskId, delegateMutation, handleClose]);

  const renderUserItem = useCallback(
    ({ item }: { item: User }) => (
      <UserRow
        user={item}
        isSelected={selectedUserId === item.id}
        onPress={() => setSelectedUserId(item.id)}
      />
    ),
    [selectedUserId],
  );

  const userKeyExtractor = useCallback((item: User) => item.id, []);

  const errorMessage = mutationError
    ? mutationError instanceof Error
      ? mutationError.message
      : 'An error occurred. Please try again.'
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <TouchableOpacity activeOpacity={1} style={styles.scrim} onPress={handleClose} />

        <View style={styles.sheet}>
          {/* ── Handle ──────────────────────────────────────────────────── */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Delegate Task</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {taskDescription && (
            <Text style={styles.taskDesc} numberOfLines={2}>
              {taskDescription}
            </Text>
          )}

          <View style={styles.scrollContent}>
            {/* ── Search Input ──────────────────────────────────────────── */}
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor={colors.textDisabled}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.searchClear}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={16} color={colors.textDisabled} />
                </TouchableOpacity>
              )}
            </View>

            {/* ── User List ─────────────────────────────────────────────── */}
            {usersLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading users...</Text>
              </View>
            ) : filteredUsers.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="people-outline" size={28} color={colors.textDisabled} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No users match your search' : 'No users available'}
                </Text>
              </View>
            ) : (
              <View style={styles.userListWrap}>
                <FlatList
                  data={filteredUsers}
                  keyExtractor={userKeyExtractor}
                  renderItem={renderUserItem}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </View>
            )}

            {/* ── Note / Reason Input ────────────────────────────────────── */}
            <View style={styles.noteSection}>
              <Text style={styles.noteLabel}>Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note about this delegation..."
                placeholderTextColor={colors.textDisabled}
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* ── Error Display ─────────────────────────────────────────── */}
            {errorMessage && (
              <View style={styles.errorWrap}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* ── Confirm Button ────────────────────────────────────────── */}
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (!selectedUserId || isPending) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedUserId || isPending}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Confirm delegation"
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.confirmBtnText}>Delegate</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: colors.screenBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '92%',
    ...shadow.lg,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },

  // ── Header ─────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  taskDesc: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    lineHeight: 18,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 16 : spacing.xl,
    gap: spacing.md,
  },
  modeDescription: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text,
    height: '100%',
  },
  searchClear: {
    padding: 2,
  },

  userListWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    height: 200,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  userRowSelected: {
    backgroundColor: colors.primaryTint,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTintStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: colors.primaryDark,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  userRole: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },

  // ── Note Input ──────────────────────────────────────────────────────
  noteSection: {
    gap: spacing.xs,
  },
  noteLabel: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },

  // ── Error ───────────────────────────────────────────────────────────
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.errorLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.error,
    lineHeight: 16,
  },

  // ── Confirm Button ──────────────────────────────────────────────────
  confirmBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.textInverse,
  },
});
