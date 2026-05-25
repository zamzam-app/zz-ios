import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { TaskCategoryOption } from '../../../api/endpoints/tasks';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';

interface TaskCategoryListProps {
  categories: TaskCategoryOption[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isAdmin: boolean;
  onRefetch: () => void;
  onBack: () => void;
  onCreate: () => void;
  onEdit: (category: TaskCategoryOption) => void;
  onDelete: (category: TaskCategoryOption) => void;
}

function CategoryItem({
  item,
  isAdmin,
  onEdit,
  onDelete,
}: {
  item: TaskCategoryOption;
  isAdmin: boolean;
  onEdit: (category: TaskCategoryOption) => void;
  onDelete: (category: TaskCategoryOption) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardBody}>
          <Text style={styles.typeName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.typeDesc} numberOfLines={1} ellipsizeMode="tail">
            {item.description}
          </Text>
        </View>
        {isAdmin && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => onEdit(item)}
              style={[styles.actionBtn, styles.editBtn]}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDelete(item)}
              style={[styles.actionBtn, styles.deleteBtn]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export function TaskCategoryList({
  categories,
  isLoading,
  isFetching,
  isAdmin,
  onRefetch,
  onBack,
  onCreate,
  onEdit,
  onDelete,
}: TaskCategoryListProps) {
  const renderItem = ({ item }: { item: TaskCategoryOption }) => (
    <CategoryItem item={item} isAdmin={isAdmin} onEdit={onEdit} onDelete={onDelete} />
  );

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headingWrap}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={onBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.heading}>Task Categories</Text>
          </View>
          <Text style={styles.subheading}>Manage foundational categories for your tasks</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.createBtn} onPress={onCreate}>
            <Text style={styles.createBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={categories ?? []}
        extraData={categories}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefetch} />
        }
        ListHeaderComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : null
        }
        renderItem={renderItem}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No task categories yet</Text> : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  headingWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: -spacing.xs,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  createBtn: {
    backgroundColor: colors.buttonPrimaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },

  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: 120 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha16,
    ...shadow.sm,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  typeName: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  typeDesc: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editBtn: {
    borderColor: colors.warmBorderAlpha50,
    backgroundColor: colors.buttonLightBg,
  },
  deleteBtn: {
    borderColor: colors.accentRedBorderSoft,
    backgroundColor: colors.accentRoseBgSoft,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xxl,
    fontSize: typography.sm,
  },
});
