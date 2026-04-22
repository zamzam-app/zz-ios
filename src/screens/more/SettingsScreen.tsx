import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useChangePassword } from '../../hooks/useUsers';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import type { MoreStackParamList } from '../../navigation/MoreNavigator';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
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

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MoreMenu');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.pageHeader}>
          <View style={styles.pageTitleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Account Settings</Text>
          </View>
          <Text style={styles.pageSubtitle}>Manage your digital atelier profile and security protocols.</Text>
        </View>

        <View style={styles.stack}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Profile Information</Text>
            </View>
            <View style={styles.formStack}>
              <Field label="Name" value={user?.name ?? '—'} />
              <Field label="Email" value={user?.email ?? '—'} />
              <Field label="Role" value={user?.role?.toUpperCase() ?? '—'} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>Security</Text>
            </View>

            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min 12 characters"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.textDisabled}
            />

            <TouchableOpacity
              style={[styles.updateBtn, changePassword.isPending && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={changePassword.isPending}
            >
              {changePassword.isPending
                ? <ActivityIndicator color={colors.textInverse} />
                : <Text style={styles.updateBtnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readonlyField}>
        <Text style={styles.readonlyFieldText}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  pageHeader: {
    marginBottom: spacing.md,
    gap: 4,
  },
  pageTitleRow: {
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
  pageTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: typography.bold,
    color: '#191C1E',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  pageSubtitle: {
    fontSize: typography.sm,
    color: '#545F73',
  },
  stack: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(211, 197, 172, 0.25)',
    padding: spacing.md,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: '#191C1E',
  },
  formStack: {
    gap: spacing.sm,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: '#4F4633',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingLeft: 2,
  },
  readonlyField: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F2F4F6',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  readonlyFieldText: {
    fontSize: typography.sm,
    color: '#191C1E',
  },
  input: {
    height: 46,
    borderRadius: 10,
    backgroundColor: '#F2F4F6',
    paddingHorizontal: spacing.md,
    fontSize: typography.sm,
    color: '#191C1E',
    marginBottom: spacing.sm,
  },
  updateBtn: {
    marginTop: spacing.xs,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#785A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtnText: {
    color: colors.textInverse,
    fontSize: typography.sm,
    fontWeight: typography.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
