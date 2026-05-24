import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Image } from 'react-native';

import type { Product } from '../../../../api/endpoints/studio';
import { colors, spacing, radius, typography } from '../../../../theme/theme';

export function CakeRow({
  item,
  categoryNames,
  onEdit,
  onDelete,
  onToggleActive,
  isMutating,
  isAdmin,
}: {
  item: Product;
  categoryNames: string[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (next: boolean) => void;
  isMutating: boolean;
  isAdmin: boolean;
}) {
  // Pricing display logic
  let displayPrice = 'N/A';
  if (item.pricing && item.pricing.length > 0) {
    const validAmounts = item.pricing
      .map((p) => p.amount)
      .filter((a) => typeof a === 'number' && !isNaN(a));
    if (validAmounts.length > 0) {
      const minAmount = Math.min(...validAmounts);
      displayPrice = `Starts at ₹${minAmount.toFixed(2)} / kg`;
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardMainRow}>
        <View style={styles.productThumbWrap}>
          {item.images?.[0] ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.productThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productThumb, styles.productThumbFallback]}>
              <Text style={{ fontSize: 20 }}>🍰</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.price}>{displayPrice}</Text>
          </View>

          {item.description ? (
            <Text style={styles.itemDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {categoryNames.length > 0 ? (
            <View style={styles.metaChipRow}>
              {categoryNames.map((name) => (
                <View key={`${item.id}-${name}`} style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{name}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      {isAdmin && (
        <View style={styles.cardFooter}>
          <Switch
            value={item.isActive}
            onValueChange={onToggleActive}
            disabled={isMutating}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.textInverse}
          />
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={onEdit} disabled={isMutating}>
              <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={onDelete} disabled={isMutating}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  productThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    flexShrink: 0,
  },
  productThumb: {
    width: '100%',
    height: '100%',
  },
  productThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.text,
  },
  price: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.success,
  },
  itemDesc: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  metaChipRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  metaChip: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.primaryTint,
  },
  metaChipText: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  cardFooter: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
