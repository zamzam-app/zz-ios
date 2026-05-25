import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Category } from '../../../../api/endpoints/studio';
import { colors, spacing, radius, typography } from '../../../../theme/theme';

export function CategoryManagerSheet({
  visible,
  categories,
  isLoading,
  isFetching,
  onRefresh,
  isAdmin,
  onClose,
  onNewCategory,
  onEditCategory,
  onDeleteCategory,
  isMutating,
}: {
  visible: boolean;
  categories: Category[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  isAdmin: boolean;
  onClose: () => void;
  onNewCategory: () => void;
  onEditCategory: (c: Category) => void;
  onDeleteCategory: (c: Category) => void;
  isMutating: boolean;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalHeaderCancel}>Done</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Categories</Text>
          {isAdmin && (
            <TouchableOpacity onPress={onNewCategory}>
              <Text style={styles.modalHeaderSave}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.categoryList}
            onRefresh={onRefresh}
            refreshing={isFetching && !isLoading}
            renderItem={({ item }) => (
              <View style={styles.categoryRow}>
                <View style={styles.categoryRowContent}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.categoryDesc}>{item.description}</Text>
                  ) : null}
                </View>
                {isAdmin && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => onEditCategory(item)}
                      disabled={isMutating}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => onDeleteCategory(item)}
                      disabled={isMutating}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No categories yet.</Text>}
          />
        )}
      </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  modalHeaderCancel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  modalHeaderSave: {
    color: colors.primary,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  categoryList: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  categoryRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  categoryRowContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  categoryDesc: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loader: {
    marginTop: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontSize: 14,
  },
});
