import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useReviews } from '../../hooks/useReviews';
import { useFranchiseAnalytics } from '../../hooks/useAnalytics';
import { Review, ComplaintStatus } from '../../api/endpoints/reviews';
import { FranchiseRankingItem, MetricsHeatmapItem } from '../../api/endpoints/analytics';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { ReviewsStackParamList } from '../../navigation/ReviewsNavigator';
import StarRating from '../../components/StarRating';

type Nav = NativeStackNavigationProp<ReviewsStackParamList, 'ReviewsList'>;
type MetricKey = keyof MetricsHeatmapItem['metrics'];
type OutletOption = { id: string; label: string };

type MetricTone = {
  bg: string;
  border: string;
  text: string;
};

const METRIC_ORDER: MetricKey[] = ['staff', 'speed', 'clean', 'quality', 'overall'];
const METRIC_LABELS: Record<MetricKey, string> = {
  staff: 'Staff',
  speed: 'Speed',
  clean: 'Clean',
  quality: 'Quality',
  overall: 'Overall',
};

function scoreToPercent(score: number | null | undefined) {
  const safe = score ?? 0;
  return Math.max(0, Math.min(100, Math.round((safe / 5) * 100)));
}

function getMetricTone(percent: number): MetricTone {
  if (percent >= 85) {
    return {
      bg: '#DCFCE7',
      border: '#BBF7D0',
      text: '#15803D',
    };
  }
  if (percent >= 65) {
    return {
      bg: '#FEF3C7',
      border: '#FDE68A',
      text: '#B45309',
    };
  }
  return {
    bg: '#FEE2E2',
    border: '#FECACA',
    text: '#B91C1C',
  };
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

function getComment(review: Review) {
  const firstText = review.userResponses.find(
    (response) => typeof response.answer === 'string' && response.answer.trim().length > 0,
  );

  if (typeof firstText?.answer === 'string' && firstText.answer.trim().length > 0) {
    return firstText.answer.trim();
  }

  if (review.complaintReason && review.complaintReason.trim().length > 0) {
    return review.complaintReason.trim();
  }

  return 'Customer complaint reported. Tap to view full details.';
}

function getSeverity(status?: ComplaintStatus) {
  if (status === 'pending') {
    return { label: 'CRITICAL', bg: colors.error, text: colors.textInverse };
  }
  return { label: 'CONCERN', bg: colors.warning, text: colors.textInverse };
}

function getReviewTags(review: Review) {
  const tags: string[] = [];

  if (review.complaintReason && review.complaintReason.trim().length > 0) {
    tags.push(review.complaintReason);
  }

  if (review.overallRating <= 2.5) {
    tags.push('Low Rating');
  }

  if (review.complaintStatus === 'pending') {
    tags.push('Needs Action');
  }

  if (tags.length === 0) {
    tags.push('Customer Feedback');
  }

  return tags.slice(0, 2);
}

function RankingItemRow({ item }: { item: FranchiseRankingItem }) {
  return (
    <View style={styles.rankRow}>
      <View style={styles.rankLeftWrap}>
        <Text style={styles.rankIndex}>{String(item.rank).padStart(2, '0')}</Text>
        <View>
          <Text style={styles.rankOutletName}>{item.outletName}</Text>
          <Text style={styles.rankManager} numberOfLines={1}>
            {item.managerNames && item.managerNames.length > 0
              ? `Mgr: ${item.managerNames[0]}`
              : 'Manager unavailable'}
          </Text>
        </View>
      </View>

      <View style={styles.rankScoreWrap}>
        <StarRating rating={item.csatScore} size={12} />
        <Text style={styles.rankScoreText}>{item.csatScore.toFixed(1)} / 5.0</Text>
      </View>
    </View>
  );
}

function HeatmapRow({ row }: { row: MetricsHeatmapItem }) {
  return (
    <View style={styles.heatmapRow}>
      <View style={styles.heatmapOutletMeta}>
        <Text style={styles.heatmapOutletName} numberOfLines={1}>{row.outletName}</Text>
      </View>
      <View style={styles.heatmapMetrics}>
        {METRIC_ORDER.map((metric) => {
          const percent = scoreToPercent(row.metrics[metric]);
          const tone = getMetricTone(percent);
          return (
            <View
              key={`${row.outletId}-${metric}`}
              style={[styles.metricCell, { backgroundColor: tone.bg, borderColor: tone.border }]}
            >
              <Text style={[styles.metricCellLabel, { color: tone.text }]}>{METRIC_LABELS[metric]}</Text>
              <Text style={[styles.metricCellValue, { color: tone.text }]}>{percent}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ReviewsScreen() {
  const navigation = useNavigation<Nav>();
  const [selectedOutletId, setSelectedOutletId] = useState('all');
  const [showOutletPicker, setShowOutletPicker] = useState(false);

  const {
    data: reviews,
    isLoading: isReviewsLoading,
    isFetching: isReviewsFetching,
    refetch: refetchReviews,
  } = useReviews();

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isFetching: isAnalyticsFetching,
    refetch: refetchAnalytics,
  } = useFranchiseAnalytics();

  const ranking = analytics?.franchiseRanking ?? [];
  const heatmap = analytics?.metricsHeatmap ?? [];

  const outletOptions = useMemo<OutletOption[]>(() => {
    if (!reviews || reviews.length === 0) {
      return [{ id: 'all', label: 'All Outlets' }];
    }

    const byOutlet = new Map<string, string>();
    for (const review of reviews) {
      const key = review.outletId || `name:${review.outletName || 'Unknown Outlet'}`;
      if (!byOutlet.has(key)) {
        byOutlet.set(key, review.outletName || 'Unknown Outlet');
      }
    }

    const options = Array.from(byOutlet.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ id: 'all', label: 'All Outlets' }, ...options];
  }, [reviews]);

  useEffect(() => {
    if (selectedOutletId === 'all') return;
    if (!outletOptions.some((option) => option.id === selectedOutletId)) {
      setSelectedOutletId('all');
    }
  }, [outletOptions, selectedOutletId]);

  const selectedOutletLabel = useMemo(
    () => outletOptions.find((option) => option.id === selectedOutletId)?.label ?? 'All Outlets',
    [outletOptions, selectedOutletId],
  );

  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    if (selectedOutletId === 'all') return reviews;

    return reviews.filter((review) => {
      const outletKey = review.outletId || `name:${review.outletName || 'Unknown Outlet'}`;
      return outletKey === selectedOutletId;
    });
  }, [reviews, selectedOutletId]);

  const pendingCount = useMemo(
    () => filteredReviews.filter((review) => review.isComplaint && review.complaintStatus === 'pending').length,
    [filteredReviews],
  );

  const criticalFeed = useMemo(() => {
    if (!filteredReviews || filteredReviews.length === 0) return [];

    const filtered = filteredReviews.filter((review) => review.isComplaint || review.overallRating <= 2);

    const sorted = [...filtered].sort((a, b) => {
      const aScore = a.isComplaint && a.complaintStatus === 'pending' ? 2 : a.isComplaint ? 1 : 0;
      const bScore = b.isComplaint && b.complaintStatus === 'pending' ? 2 : b.isComplaint ? 1 : 0;
      if (aScore !== bScore) return bScore - aScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    if (sorted.length > 0) return sorted;

    return [...filteredReviews]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [filteredReviews]);

  const allReviews = useMemo(
    () => [...filteredReviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filteredReviews],
  );

  const heatmapRows = useMemo(() => {
    const heatmapByOutlet = new Map(heatmap.map((item) => [item.outletId, item]));

    const ordered = ranking
      .map((rankItem) => heatmapByOutlet.get(rankItem.outletId))
      .filter((item): item is MetricsHeatmapItem => Boolean(item));

    const rankedIds = new Set(ranking.map((item) => item.outletId));
    const extras = heatmap.filter((item) => !rankedIds.has(item.outletId));

    return [...ordered, ...extras];
  }, [heatmap, ranking]);

  const refreshing = isReviewsFetching || isAnalyticsFetching;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing && !isReviewsLoading}
            onRefresh={() => {
              void refetchReviews();
              void refetchAnalytics();
            }}
          />
        )}
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.heading}>Reviews & Performance</Text>
            <Text style={styles.subheading}>Real-time franchise health and sentiment analysis.</Text>
          </View>

          <TouchableOpacity style={styles.exportButton} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionStack}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>Franchise Ranking</Text>
            </View>

            {isAnalyticsLoading ? (
              <ActivityIndicator color={colors.primary} style={styles.loading} />
            ) : ranking.length === 0 ? (
              <Text style={styles.emptyText}>No franchise ranking available.</Text>
            ) : (
              <View style={styles.rankList}>
                {ranking.map((item) => (
                  <RankingItemRow key={item.outletId} item={item} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>Outlet Performance Heatmap</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.legendText}>Good</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>Mid</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Alert</Text>
                </View>
              </View>
            </View>

            {isAnalyticsLoading ? (
              <ActivityIndicator color={colors.primary} style={styles.loading} />
            ) : heatmapRows.length === 0 ? (
              <Text style={styles.emptyText}>No heatmap metrics available.</Text>
            ) : (
              <View style={styles.heatmapList}>
                {heatmapRows.map((row) => (
                  <HeatmapRow key={row.outletId} row={row} />
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.sectionEyebrow}>Outlet Filter</Text>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.85} onPress={() => setShowOutletPicker(true)}>
            <Text style={styles.filterButtonText} numberOfLines={1}>{selectedOutletLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.feedbackHeaderRow}>
          <Text style={styles.sectionEyebrow}>Critical Feedback Feed</Text>
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>{pendingCount} URGENT</Text>
          </View>
        </View>

        <View style={styles.feedbackContainer}>
          {isReviewsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : criticalFeed.length === 0 ? (
            <Text style={styles.emptyText}>No reviews available.</Text>
          ) : (
            criticalFeed.map((review, index) => {
              const severity = getSeverity(review.complaintStatus);
              const tags = getReviewTags(review);

              return (
                <TouchableOpacity
                  key={review.id}
                  style={[styles.feedbackItem, index < criticalFeed.length - 1 && styles.feedbackItemBorder]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ReviewDetail', { reviewId: review.id })}
                >
                  <View style={styles.feedbackTopRow}>
                    <View style={styles.feedbackMetaLeft}>
                      <View style={[styles.severityBadge, { backgroundColor: severity.bg }]}>
                        <Text style={[styles.severityBadgeText, { color: severity.text }]}>{severity.label}</Text>
                      </View>
                      <Text style={styles.feedbackName}>{review.customerName}</Text>
                      <Text style={styles.feedbackAge}>• {formatRelativeTime(review.createdAt)}</Text>
                    </View>
                    <Text style={styles.feedbackOutlet}>{review.outletName}</Text>
                  </View>

                  <Text style={styles.feedbackBody}>{getComment(review)}</Text>

                  <View style={styles.feedbackFooterRow}>
                    <StarRating rating={review.overallRating} size={12} />
                    <View style={styles.feedbackTagRow}>
                      {tags.map((tag) => (
                        <Text key={`${review.id}-${tag}`} style={styles.feedbackTag}>{tag}</Text>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.feedbackHeaderRow}>
          <Text style={styles.sectionEyebrow}>All Reviews</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>{allReviews.length} TOTAL</Text>
          </View>
        </View>

        <View style={styles.feedbackContainer}>
          {isReviewsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : allReviews.length === 0 ? (
            <Text style={styles.emptyText}>No reviews available.</Text>
          ) : (
            allReviews.map((review, index) => {
              const tags = getReviewTags(review);
              return (
                <TouchableOpacity
                  key={`all-${review.id}`}
                  style={[styles.feedbackItem, index < allReviews.length - 1 && styles.feedbackItemBorder]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ReviewDetail', { reviewId: review.id })}
                >
                  <View style={styles.feedbackTopRow}>
                    <View style={styles.feedbackMetaLeft}>
                      <Text style={styles.feedbackName}>{review.customerName}</Text>
                      <Text style={styles.feedbackAge}>• {formatRelativeTime(review.createdAt)}</Text>
                    </View>
                    <Text style={styles.feedbackOutlet}>{review.outletName}</Text>
                  </View>

                  <Text style={styles.feedbackBody}>{getComment(review)}</Text>

                  <View style={styles.feedbackFooterRow}>
                    <StarRating rating={review.overallRating} size={12} />
                    <View style={styles.feedbackTagRow}>
                      {tags.map((tag) => (
                        <Text key={`all-${review.id}-${tag}`} style={styles.feedbackTag}>{tag}</Text>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showOutletPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOutletPicker(false)}
      >
        <View style={styles.pickerRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.pickerScrim}
            onPress={() => setShowOutletPicker(false)}
          />
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select Outlet</Text>
            <ScrollView
              style={styles.pickerList}
              contentContainerStyle={styles.pickerListContent}
              showsVerticalScrollIndicator={false}
            >
              {outletOptions.map((option) => {
                const active = option.id === selectedOutletId;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.pickerItem, active && styles.pickerItemActive]}
                    onPress={() => {
                      setSelectedOutletId(option.id);
                      setShowOutletPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, active && styles.pickerItemTextActive]}>{option.label}</Text>
                    {active ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.md,
  },

  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  exportButton: {
    backgroundColor: colors.buttonPrimaryBg,
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },

  sectionStack: {
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: 4,
  },
  sectionEyebrow: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#4F4633',
  },

  rankList: {
    gap: spacing.sm,
  },
  rankRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D3C5AC26',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rankIndex: {
    width: 28,
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: '#D3C5AC',
    fontStyle: 'italic',
  },
  rankOutletName: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.text,
  },
  rankManager: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rankScoreWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rankScoreText: {
    fontSize: 10,
    color: '#4F4633',
    fontWeight: typography.bold,
  },

  legendRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
  },
  legendText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },

  heatmapList: {
    gap: spacing.sm,
  },
  heatmapRow: {
    backgroundColor: '#F2F4F6',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heatmapOutletMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heatmapOutletName: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.text,
  },
  heatmapMetrics: {
    flexDirection: 'row',
    gap: 4,
  },
  metricCell: {
    flex: 1,
    borderRadius: 7,
    borderWidth: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCellLabel: {
    fontSize: 9,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
  },
  metricCellValue: {
    marginTop: 1,
    fontSize: typography.xs,
    fontWeight: typography.bold,
  },

  feedbackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  filterButton: {
    minWidth: 180,
    maxWidth: '68%',
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  filterButtonText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text,
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

  feedbackContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#D3C5AC26',
    overflow: 'hidden',
    ...shadow.sm,
  },
  feedbackItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  feedbackItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F4F6',
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
    color: '#4F4633',
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
    backgroundColor: '#F2F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },

  pickerRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pickerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 28, 30, 0.45)',
  },
  pickerCard: {
    maxHeight: '70%',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadow.md,
  },
  pickerTitle: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: colors.text,
  },
  pickerList: {
    maxHeight: 360,
  },
  pickerListContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  pickerItem: {
    height: 42,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pickerItemActive: {
    backgroundColor: colors.primaryTint,
  },
  pickerItemText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text,
  },
  pickerItemTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.semibold,
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
