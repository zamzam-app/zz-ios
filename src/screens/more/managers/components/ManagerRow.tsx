import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';

import { User } from '../../../../api/endpoints/users';
import { colors, spacing, radius, typography } from '../../../../theme/theme';

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || 'M';
}

export function ManagerRow({
  manager,
  onToggle,
  onDelete,
  onPress,
  isMutating,
  canDelete,
}: {
  manager: User;
  onToggle: (manager: User, next: boolean) => void;
  onDelete: (manager: User) => void;
  onPress: (manager: User) => void;
  isMutating: boolean;
  canDelete: boolean;
}) {
  const isActive = manager.isActive ?? true;

  return (
    <View style={styles.managerRow}>
      <TouchableOpacity
        style={styles.rowLeft}
        activeOpacity={0.86}
        onPress={() => onPress(manager)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(manager.name)}</Text>
        </View>

        <View style={styles.identityWrap}>
          <Text style={styles.managerName} numberOfLines={1}>
            {manager.name}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.rowRight}>
        <Switch
          value={isActive}
          disabled={isMutating}
          onValueChange={(next) => onToggle(manager, next)}
          trackColor={{ false: '#D6D3D1', true: colors.primaryLight }}
          thumbColor={colors.surface}
          ios_backgroundColor="#D6D3D1"
        />
        {canDelete ? (
          <TouchableOpacity
            onPress={() => onDelete(manager)}
            disabled={isMutating}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
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
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
