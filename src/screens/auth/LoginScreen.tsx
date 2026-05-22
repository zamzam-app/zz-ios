import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { ADMIN_EMAIL } from '../../config/env';
import { colors, spacing, radius, typography } from '../../theme/theme';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);

  const resolvedIdentifier = isAdminLogin ? ADMIN_EMAIL : identifier.trim();

  const handleLogin = async () => {
    if (!resolvedIdentifier || !password) return;
    setSubmitting(true);
    try {
      await login(resolvedIdentifier, password, isAdminLogin);
    } catch {
      Alert.alert('Login failed', 'Check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.heading}>{isAdminLogin ? 'Admin Portal' : 'Manager Portal'}</Text>
        <Text style={styles.subheading}>Sign in to your account</Text>

        <View style={styles.form}>
          <Text style={styles.label}>{isAdminLogin ? 'Email' : 'Username'}</Text>
          <TextInput
            style={[styles.input, isAdminLogin && styles.inputDisabled]}
            placeholder={isAdminLogin ? 'you@zamzam.com' : 'manager_username'}
            placeholderTextColor={colors.textDisabled}
            keyboardType={isAdminLogin ? 'email-address' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
            value={resolvedIdentifier}
            onChangeText={setIdentifier}
            returnKeyType="next"
            editable={!isAdminLogin}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textDisabled}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>Admin Login</Text>
            <Switch
              value={isAdminLogin}
              onValueChange={setIsAdminLogin}
              trackColor={{ false: '#D6D3D1', true: colors.primaryLight }}
              thumbColor={colors.surface}
              ios_backgroundColor="#D6D3D1"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: 80,
    height: 80,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subheading: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.sm,
  },
  modeRow: {
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modeLabel: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
    marginBottom: 2,
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
    marginBottom: spacing.sm,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F4',
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});
