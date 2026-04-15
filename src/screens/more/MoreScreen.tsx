import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { MoreStackParamList } from '../../navigation/MoreNavigator';

type Nav = NativeStackNavigationProp<MoreStackParamList, 'MoreMenu'>;

interface MenuItem {
  label: string;
  screen: keyof MoreStackParamList;
  adminOnly?: boolean;
  icon: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Profile & Settings', screen: 'Settings', icon: '👤' },
  { label: 'Managers', screen: 'Managers', icon: '👥', adminOnly: true },
  { label: 'Studio', screen: 'Studio', icon: '🛍️' },
  { label: 'Form Builder', screen: 'FormBuilder', icon: '📋', adminOnly: true },
];

export default function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const visibleItems = MENU_ITEMS.filter((item) =>
    item.adminOnly ? user?.role === 'admin' : true,
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>More</Text>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menuCard}>
          {visibleItems.map((item, index) => (
            <TouchableOpacity
              key={item.screen}
              style={[styles.menuItem, index < visibleItems.length - 1 && styles.menuItemBorder]}
              onPress={() => navigation.navigate(item.screen as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: 120, gap: spacing.md, paddingTop: spacing.md },
  heading: { fontSize: typography.xl, fontWeight: typography.bold, color: colors.text, letterSpacing: -0.5 },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.textInverse, fontSize: typography.xl, fontWeight: typography.bold },
  userName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  userEmail: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  rolePill: {
    marginTop: 6,
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  roleText: { fontSize: typography.xs, color: colors.primary, fontWeight: typography.semibold },

  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  menuLabel: { flex: 1, fontSize: typography.base, color: colors.text },
  chevron: { fontSize: 20, color: colors.textSecondary },

  logoutBtn: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  logoutText: { color: colors.error, fontSize: typography.base, fontWeight: typography.medium },
});
