import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useChangePassword } from '../../hooks/useUsers';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const changePassword = useChangePassword();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword)
      return Alert.alert('Required', 'Please fill in all fields.');
    if (newPassword !== confirmPassword)
      return Alert.alert('Mismatch', 'New passwords do not match.');
    if (newPassword.length < 4)
      return Alert.alert('Too short', 'Password must be at least 4 characters.');
    if (!user?.id) return;

    changePassword.mutate(
      { id: user.id, payload: { oldPassword, newPassword } },
      {
        onSuccess: () => {
          Alert.alert('Done', 'Password updated successfully.');
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        },
        onError: () => Alert.alert('Error', 'Failed to update password. Check your current password.'),
      },
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Profile */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <Row label="Name" value={user?.name ?? '—'} />
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Role" value={user?.role?.toUpperCase() ?? '—'} last />
        </View>

        {/* Change password */}
        <Text style={styles.sectionTitle}>Change Password</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textDisabled}
          />
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textDisabled}
          />
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { marginBottom: 0 }]}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textDisabled}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, changePassword.isPending && { opacity: 0.6 }]}
          onPress={handleChangePassword}
          disabled={changePassword.isPending}
        >
          {changePassword.isPending
            ? <ActivityIndicator color={colors.textInverse} />
            : <Text style={styles.saveBtnText}>Update Password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  sectionTitle: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: typography.sm, color: colors.textSecondary },
  rowValue: { fontSize: typography.sm, color: colors.text, fontWeight: typography.medium },
  label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.text },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 13,
    fontSize: typography.base, color: colors.text, backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center',
  },
  saveBtnText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },
});
