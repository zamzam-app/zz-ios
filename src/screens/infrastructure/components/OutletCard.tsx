import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

import type { Outlet } from '../../../api/endpoints/outlets';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';

interface OutletCardProps {
  outlet: Outlet;
  isAdmin: boolean;
  onPress: () => void;
  onQrPress: () => void;
  onEditPress: () => void;
  onDelete: () => void;
}

function FallbackOutletImage({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || 'O';
  return (
    <View style={styles.outletImageFallback}>
      <Text style={styles.outletImageFallbackText}>{letter}</Text>
    </View>
  );
}

function OutletCard({
  outlet,
  isAdmin,
  onPress,
  onQrPress,
  onEditPress,
  onDelete,
}: OutletCardProps) {
  const imageUri = outlet.images?.[0];
  const managerLabel =
    outlet.managerNames && outlet.managerNames.length > 0
      ? `${outlet.managerNames.length > 1 ? 'Managers' : 'Manager'}: ${outlet.managerNames.join(', ')}`
      : 'Manager unavailable';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.cardMainRow}>
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.outletImage} resizeMode="cover" />
          ) : (
            <FallbackOutletImage name={outlet.name} />
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.outletName}>{outlet.name}</Text>
              {outlet.outletTypeName ? (
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{outlet.outletTypeName}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.rightMeta}>
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>ACTIVE</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity
                  onPress={onDelete}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.metaRows}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {outlet.address ?? 'No address'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {managerLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onQrPress}>
          <Ionicons name="qr-code-outline" size={16} color={colors.text} />
          <Text style={styles.actionBtnText}>QR Code</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity style={styles.actionBtn} onPress={onEditPress}>
            <Ionicons name="create-outline" size={16} color={colors.text} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(OutletCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha16,
    ...shadow.sm,
    gap: spacing.sm,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.uiGray1,
    flexShrink: 0,
  },
  outletImage: {
    width: '100%',
    height: '100%',
  },
  outletImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray4,
  },
  outletImageFallbackText: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.accentCoffee,
  },
  cardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleGroup: {
    flex: 1,
    gap: 4,
  },
  outletName: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  typeChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryTint,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeChipText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rightMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.accentGreen,
  },
  activeText: {
    fontSize: 10,
    fontWeight: typography.bold,
    color: colors.success,
    letterSpacing: 0.3,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  metaRows: {
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: 2,
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.buttonLightBg,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
});
