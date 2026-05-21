import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme/theme';
import type { Actor } from '../types/task';

interface DelegationBannerProps {
  delegatedTo: Actor;
  delegatedBy: Actor;
  delegatedAt: string;
  onRevoke?: () => void;
  isRevoking?: boolean;
}

function formatRelativeTime(iso: string) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const diffMs = Date.now() - time;
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function DelegationBanner({
  delegatedTo,
  delegatedBy,
  delegatedAt,
  onRevoke,
  isRevoking = false,
}: DelegationBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.bannerLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name="swap-horizontal" size={14} color={colors.primaryDark} />
        </View>
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerText}>
            Delegated to <Text style={styles.bannerName}>{delegatedTo.name}</Text>
          </Text>
          <Text style={styles.bannerSubtext}>
            by {delegatedBy.name} &middot; {formatRelativeTime(delegatedAt)}
          </Text>
        </View>
      </View>
      {onRevoke && (
        <TouchableOpacity
          style={styles.revokeBtn}
          onPress={onRevoke}
          disabled={isRevoking}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Revoke delegation"
        >
          {isRevoking ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={styles.revokeBtnText}>Revoke</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default React.memo(DelegationBanner);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryTint,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryTintStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTintStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextWrap: {
    flex: 1,
    gap: 1,
  },
  bannerText: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
  },
  bannerName: {
    fontWeight: typography.bold,
    color: colors.primaryDark,
  },
  bannerSubtext: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  revokeBtn: {
    minWidth: 64,
    minHeight: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  revokeBtnText: {
    fontSize: typography.xs,
    color: colors.error,
    fontWeight: typography.semibold,
  },
});
