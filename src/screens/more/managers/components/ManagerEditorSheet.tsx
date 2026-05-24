import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius, typography } from '../../../../theme/theme';

export function ManagerEditorSheet({
  visible,
  isEditMode,
  newName,
  setNewName,
  newUserName,
  setNewUserName,
  newPhone,
  setNewPhone,
  newPassword,
  setNewPassword,
  onSave,
  onClose,
  canSave,
  isPending,
}: {
  visible: boolean;
  isEditMode: boolean;
  newName: string;
  setNewName: (v: string) => void;
  newUserName: string;
  setNewUserName: (v: string) => void;
  newPhone: string;
  setNewPhone: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
  canSave: boolean;
  isPending: boolean;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalHeaderCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditMode ? 'Edit Manager' : 'New Manager'}</Text>
            <TouchableOpacity onPress={onSave} disabled={!canSave}>
              {isPending ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={[styles.modalHeaderSave, !canSave && styles.modalHeaderSaveDisabled]}>
                  Save
                </Text>
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

            {!isEditMode ? (
              <>
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
              </>
            ) : null}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  modalHeaderSaveDisabled: {
    color: colors.textDisabled,
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
