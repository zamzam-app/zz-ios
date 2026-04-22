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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useManagers, useUpdateManager } from '../../hooks/useUsers';
import { User } from '../../api/endpoints/users';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import type { MoreStackParamList } from '../../navigation/MoreNavigator';

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'M';
}

function ManagerRow({
  manager,
  onToggle,
  isMutating,
}: {
  manager: User;
  onToggle: (manager: User, next: boolean) => void;
  isMutating: boolean;
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

      <Switch
        value={isActive}
        disabled={isMutating}
        onValueChange={(next) => onToggle(manager, next)}
        trackColor={{ false: '#D6D3D1', true: colors.primaryLight }}
        thumbColor={colors.surface}
        ios_backgroundColor="#D6D3D1"
      />
    </View>
  );
}

export default function ManagersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { data: managers, isLoading, isFetching, refetch } = useManagers();
  const updateManager = useUpdateManager();

  const [query, setQuery] = useState('');

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
                  isMutating={updateManager.isPending}
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No managers found.</Text>}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F9FB',
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
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontSize: typography.sm,
  },
});
