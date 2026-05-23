import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';

import { Review } from '../../../api/endpoints/reviews';
import StarRating from '../../../components/shared/StarRating';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';
import { formatDate, getComplaintTone } from '../hooks/useComplaintResolutionState';

export function ReviewSummaryCard({ review, isAdmin }: { review: Review; isAdmin: boolean }) {
  const complaintTone = getComplaintTone(review);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.topRow}>
        <Text style={styles.summaryTitle} numberOfLines={1}>
          {isAdmin ? review.customerName : 'Customer'}
        </Text>
        <View style={styles.ratingWrap}>
          <StarRating rating={review.overallRating} size={14} />
          <Text style={styles.ratingText}>{review.overallRating.toFixed(1)} / 5.0</Text>
        </View>
      </View>

      <Text style={styles.summaryOutlet}>{review.outletName}</Text>
      {isAdmin && review.customerPhone && (
        <Text
          style={styles.summaryPhone}
          onPress={() => Linking.openURL(`tel:${review.customerPhone}`)}
        >
          <Ionicons name="call-outline" size={12} color={colors.textSecondary} />{' '}
          {review.customerPhone}
        </Text>
      )}
      <Text style={styles.summaryMeta}>Submitted on {formatDate(review.createdAt)}</Text>
      <View style={styles.summaryStatusRow}>
        <Text style={styles.summaryStatusLabel}>Status:</Text>
        {complaintTone ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: complaintTone.bg, borderColor: complaintTone.border },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: complaintTone.text }]}>
              {complaintTone.label}
            </Text>
          </View>
        ) : (
          <View style={styles.feedbackBadge}>
            <Text style={styles.feedbackBadgeText}>Feedback</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha25,
    ...shadow.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  feedbackBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.uiGray0,
    borderWidth: 1,
    borderColor: colors.uiSlate200,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  feedbackBadgeText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  ratingWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.bold,
  },
  summaryTitle: {
    fontSize: typography.lg,
    color: colors.text,
    fontWeight: typography.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  summaryOutlet: {
    marginTop: spacing.xs,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: 2,
  },
  summaryPhone: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMeta: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  summaryStatusRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryStatusLabel: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.semibold,
  },
});
