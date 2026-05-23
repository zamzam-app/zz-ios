import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { Review } from '../../../api/endpoints/reviews';
import StarRating from '../../../components/shared/StarRating';
import { ReviewsStackParamList } from '../../../navigation/ReviewsNavigator';
import { colors, spacing, radius, typography } from '../../../theme/theme';
import {
  formatRelativeTime,
  getComment,
  getReviewTags,
  getAllReviewCardBackground,
} from '../hooks/useReviewsFilterState';

type Nav = NativeStackNavigationProp<ReviewsStackParamList, 'ReviewsList'>;

export function AllReviewsSection({
  displayedAllReviews,
  searchQuery,
  setSearchQuery,
  allReviewsFilter,
  setAllReviewsFilter,
  isAdmin,
  setShowFilterModal,
  isLoading,
  allReviewsEmptyMessage,
}: {
  displayedAllReviews: Review[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  allReviewsFilter: 'all' | 'open' | 'resolved' | 'critical' | 'concern';
  setAllReviewsFilter: (f: 'all' | 'open' | 'resolved' | 'critical' | 'concern') => void;
  isAdmin: boolean;
  setShowFilterModal: (v: boolean) => void;
  isLoading: boolean;
  allReviewsEmptyMessage: string;
}) {
  const navigation = useNavigation<Nav>();

  return (
    <>
      <View style={styles.feedbackHeaderRow}>
        <Text style={styles.sectionEyebrow}>All Reviews</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>{displayedAllReviews.length} TOTAL</Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholder="Search reviews..."
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.searchClearBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <Text style={styles.searchClearText}>x</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterMenuWrap}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            style={[styles.filterIconBtn, allReviewsFilter !== 'all' && styles.filterIconBtnActive]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.82}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={allReviewsFilter === 'all' ? colors.textSecondary : colors.primaryDark}
            />
          </TouchableOpacity>
        </View>
      </View>

      {allReviewsFilter !== 'all' && (
        <View style={styles.metricFilterChipRow}>
          <View style={styles.metricFilterChip}>
            <Text style={styles.metricFilterChipText}>
              {`Status: ${allReviewsFilter.charAt(0).toUpperCase() + allReviewsFilter.slice(1)}`}
            </Text>
            <TouchableOpacity
              onPress={() => setAllReviewsFilter('all')}
              style={styles.metricFilterChipClear}
            >
              <Text style={styles.metricFilterChipClearText}>x</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.feedbackContainer}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : displayedAllReviews.length === 0 ? (
          <Text style={styles.emptyText}>{allReviewsEmptyMessage}</Text>
        ) : (
          displayedAllReviews.map((review, index) => {
            const tags = getReviewTags(review);
            return (
              <TouchableOpacity
                key={`all-${review.id}`}
                style={[
                  styles.feedbackItem,
                  { backgroundColor: getAllReviewCardBackground(review) },
                  index < displayedAllReviews.length - 1 && styles.feedbackItemBorder,
                ]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ReviewDetail', { reviewId: review.id })}
              >
                <View style={styles.feedbackTopRow}>
                  <View style={styles.feedbackMetaLeft}>
                    <Text style={styles.feedbackName}>
                      {isAdmin ? review.customerName : 'Customer'}
                    </Text>
                    <Text style={styles.feedbackAge}>• {formatRelativeTime(review.createdAt)}</Text>
                  </View>
                  <Text style={styles.feedbackOutlet}>{review.outletName}</Text>
                </View>

                <Text style={styles.feedbackBody}>{getComment(review)}</Text>

                <View style={styles.feedbackFooterRow}>
                  <StarRating rating={review.overallRating} size={12} />
                  <View style={styles.feedbackTagRow}>
                    {tags.map((tag) => (
                      <Text key={`all-${review.id}-${tag}`} style={styles.feedbackTag}>
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
  totalBadge: {
    backgroundColor: colors.primaryTint,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  totalBadgeText: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 40,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: typography.sm,
    color: colors.text,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    color: colors.textDisabled,
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterMenuWrap: {
    width: 40,
    height: 40,
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconBtnActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintStrong,
  },
  metricFilterChipRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  metricFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryTint,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primaryTintStrong,
  },
  metricFilterChipText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  metricFilterChipClear: {
    marginLeft: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricFilterChipClearText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: -1,
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
  feedbackMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
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
