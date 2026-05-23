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

import { OutletType } from '../../../api/endpoints/outletTypes';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';

interface OutletTypeListProps {
  types: OutletType[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
  isAdmin: boolean;
  onEdit: (type: OutletType) => void;
  onDelete: (type: OutletType) => void;
}

export default function OutletTypeList({
  types,
  isLoading,
  isFetching,
  refetch,
  isAdmin,
  onEdit,
  onDelete,
}: OutletTypeListProps) {
  const renderItem = ({ item }: { item: OutletType }) => (
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

  return (
    <FlatList
      data={types ?? []}
      extraData={types}
      keyExtractor={(t) => t.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
      ListHeaderComponent={
        isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
        ) : null
      }
      renderItem={renderItem}
      ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No outlet types yet</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
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
