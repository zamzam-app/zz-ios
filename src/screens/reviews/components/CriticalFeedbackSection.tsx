import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

import { Review } from '../../../api/endpoints/reviews';
import StarRating from '../../../components/shared/StarRating';
import { ReviewsStackParamList } from '../../../navigation/ReviewsNavigator';
import { colors, spacing, radius, typography } from '../../../theme/theme';
import {
  formatRelativeTime,
  getComment,
  getReviewTags,
  getSeverity,
} from '../hooks/useReviewsFilterState';

type Nav = NativeStackNavigationProp<ReviewsStackParamList, 'ReviewsList'>;

export function CriticalFeedbackSection({
  criticalFeed,
  pendingCount,
  isAdmin,
  isLoading,
}: {
  criticalFeed: Review[];
  pendingCount: number;
  isAdmin: boolean;
  isLoading: boolean;
}) {
  const navigation = useNavigation<Nav>();

  return (
    <>
      <View style={styles.feedbackHeaderRow}>
        <Text style={styles.sectionEyebrow}>Critical Feedback Feed</Text>
        <View style={styles.urgentBadge}>
          <Text style={styles.urgentBadgeText}>{pendingCount} URGENT</Text>
        </View>
      </View>

      <View style={styles.feedbackContainer}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : criticalFeed.length === 0 ? (
          <Text style={styles.emptyText}>No unresolved critical reviews.</Text>
        ) : (
          criticalFeed.map((review, index) => {
            const severity = getSeverity(review.overallRating);
            const tags = getReviewTags(review);

            return (
              <TouchableOpacity
                key={review.id}
                style={[
                  styles.feedbackItem,
                  index < criticalFeed.length - 1 && styles.feedbackItemBorder,
                ]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ReviewDetail', { reviewId: review.id })}
              >
                <View style={styles.feedbackTopRow}>
                  <View style={styles.feedbackCriticalMeta}>
                    <View style={styles.feedbackStatusRow}>
                      <View style={[styles.severityBadge, { backgroundColor: severity.bg }]}>
                        <Text style={[styles.severityBadgeText, { color: severity.text }]}>
                          {severity.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.feedbackIdentityRow}>
                      <Text style={styles.feedbackName}>
                        {isAdmin ? review.customerName : 'Customer'}
                      </Text>
                      <Text style={styles.feedbackAge}>
                        • {formatRelativeTime(review.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackOutlet}>{review.outletName}</Text>
                </View>

                <Text style={styles.feedbackBody}>{getComment(review)}</Text>

                <View style={styles.feedbackFooterRow}>
                  <StarRating rating={review.overallRating} size={12} />
                  <View style={styles.feedbackTagRow}>
                    {tags.map((tag) => (
                      <Text key={`${review.id}-${tag}`} style={styles.feedbackTag}>
                        {tag}
                      </Text>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionEyebrow: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.accentBrownText,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  urgentBadge: {
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentBadgeText: {
    fontSize: 10,
    color: colors.error,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  feedbackContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha16,
    overflow: 'hidden',
  },
  feedbackItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  feedbackItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.uiGray1,
  },
  feedbackTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  feedbackCriticalMeta: {
    gap: 4,
    flexShrink: 1,
  },
  feedbackStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  feedbackIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  severityBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  severityBadgeText: {
    fontSize: 9,
    fontWeight: typography.bold,
    letterSpacing: 0.3,
  },
  feedbackName: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: colors.text,
  },
  feedbackAge: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  feedbackOutlet: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: typography.bold,
    maxWidth: 120,
    textAlign: 'right',
  },
  feedbackBody: {
    fontSize: typography.sm,
    color: colors.accentBrownText,
    lineHeight: 20,
  },
  feedbackFooterRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  feedbackTagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
  },
  feedbackTag: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.uiGray1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  loading: {
    marginVertical: spacing.md,
  },
  emptyText: {
    paddingVertical: spacing.md,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
});
