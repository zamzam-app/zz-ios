import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator } from 'react-native';

import { User } from '../../../../api/endpoints/users';
import { colors, spacing, radius, typography, shadow } from '../../../../theme/theme';

import { ManagerRow } from './ManagerRow';

export function ManagersList({
  managers,
  filteredManagers,
  isLoading,
  isFetching,
  onRefresh,
  query,
  onQueryChange,
  onToggleActive,
  onDeleteManager,
  onEditManager,
  isMutating,
  isAdmin,
}: {
  managers: User[];
  filteredManagers: User[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  query: string;
  onQueryChange: (v: string) => void;
  onToggleActive: (manager: User, next: boolean) => void;
  onDeleteManager: (manager: User) => void;
  onEditManager: (manager: User) => void;
  isMutating: boolean;
  isAdmin: boolean;
}) {
  const totalCount = managers.length;

  return (
    <>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
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
            onRefresh={onRefresh}
            refreshing={isFetching && !isLoading}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ManagerRow
                manager={item}
                onToggle={onToggleActive}
                onDelete={onDeleteManager}
                onPress={onEditManager}
                isMutating={isMutating}
                canDelete={isAdmin}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No managers found.</Text>}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.uiGray1,
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
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontSize: typography.sm,
  },
});
