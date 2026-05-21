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
import { useDelegateTask, useReassignTask } from '../hooks/useTaskDelegation';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';
import type { User } from '../api/endpoints/users';

type Mode = 'delegate' | 'reassign';

interface DelegationSheetProps {
  visible: boolean;
  onClose: () => void;
  taskId: string;
  /** Description of the task, shown in the sheet header for context */
  taskDescription?: string;
  /** Current owner name, shown for context */
  currentOwnerName?: string;
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
      {isSelected && (
        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}

export default function DelegationSheet({
  visible,
  onClose,
  taskId,
  taskDescription,
  currentOwnerName,
}: DelegationSheetProps) {
  const [mode, setMode] = useState<Mode>('delegate');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Reset internal state when sheet opens
  const handleClose = useCallback(() => {
    setSearchQuery('');
    setSelectedUserId(null);
    setNote('');
    setMode('delegate');
    onClose();
  }, [onClose]);

  const { data: users, isLoading: usersLoading } = useUsers();
  const delegateMutation = useDelegateTask();
  const reassignMutation = useReassignTask();

  const isPending =
    mode === 'delegate' ? delegateMutation.isPending : reassignMutation.isPending;
  const mutationError =
    mode === 'delegate' ? delegateMutation.error : reassignMutation.error;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query),
    );
  }, [users, searchQuery]);

  const handleConfirm = useCallback(() => {
    if (!selectedUserId) return;

    if (mode === 'delegate') {
      delegateMutation.mutate(
        { taskId, payload: { delegatedTo: selectedUserId, note: note.trim() || undefined } },
        { onSuccess: handleClose },
      );
    } else {
      reassignMutation.mutate(
        { taskId, payload: { newOwnerId: selectedUserId, reason: note.trim() || undefined } },
        { onSuccess: handleClose },
      );
    }
  }, [selectedUserId, mode, note, taskId, delegateMutation, reassignMutation, handleClose]);

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
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.scrim}
          onPress={handleClose}
        />

        <View style={styles.sheet}>
          {/* ── Handle ──────────────────────────────────────────────────── */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === 'delegate' ? 'Delegate Task' : 'Reassign Task'}
            </Text>
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

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Mode Toggle ───────────────────────────────────────────── */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'delegate' && styles.modeBtnActive]}
                onPress={() => setMode('delegate')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={mode === 'delegate' ? colors.textInverse : colors.textSecondary}
                />
                <Text
                  style={[styles.modeBtnText, mode === 'delegate' && styles.modeBtnTextActive]}
                >
                  Delegate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'reassign' && styles.modeBtnActive]}
                onPress={() => setMode('reassign')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={14}
                  color={mode === 'reassign' ? colors.textInverse : colors.textSecondary}
                />
                <Text
                  style={[styles.modeBtnText, mode === 'reassign' && styles.modeBtnTextActive]}
                >
                  Reassign
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Mode Description ──────────────────────────────────────── */}
            <Text style={styles.modeDescription}>
              {mode === 'delegate'
                ? 'Temporarily hand off this task to another user. You can revoke this later.'
                : 'Permanently transfer ownership of this task to another user.'}
            </Text>

            {currentOwnerName && mode === 'reassign' && (
              <Text style={styles.currentOwner}>
                Current owner: <Text style={styles.currentOwnerName}>{currentOwnerName}</Text>
              </Text>
            )}

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
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
              </View>
            )}

            {/* ── Note / Reason Input ────────────────────────────────────── */}
            <View style={styles.noteSection}>
              <Text style={styles.noteLabel}>
                {mode === 'delegate' ? 'Note (optional)' : 'Reason (optional)'}
              </Text>
              <TextInput
                style={styles.noteInput}
                placeholder={
                  mode === 'delegate'
                    ? 'Add a note about this delegation...'
                    : 'Explain why this task is being reassigned...'
                }
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
              accessibilityLabel={
                mode === 'delegate' ? 'Confirm delegation' : 'Confirm reassignment'
              }
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.confirmBtnText}>
                  {mode === 'delegate' ? 'Delegate' : 'Reassign'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
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

  // ── Scroll Body ─────────────────────────────────────────────────────
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 16 : spacing.xl,
    gap: spacing.md,
  },

  // ── Mode Toggle ─────────────────────────────────────────────────────
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  modeBtnTextActive: {
    color: colors.textInverse,
  },

  // ── Info text ───────────────────────────────────────────────────────
  modeDescription: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  currentOwner: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    paddingHorizontal: 2,
  },
  currentOwnerName: {
    fontWeight: typography.semibold,
    color: colors.text,
  },

  // ── Search ──────────────────────────────────────────────────────────
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

  // ── User List ───────────────────────────────────────────────────────
  userListWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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
