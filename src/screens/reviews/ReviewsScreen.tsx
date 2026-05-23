import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FranchiseRankingItem, MetricsHeatmapItem } from '../../api/endpoints/analytics';
import { Review } from '../../api/endpoints/reviews';
import StarRating from '../../components/StarRating';
import { ReviewMetricFilter } from '../../constants/reviewFilters';
import { useFranchiseAnalytics } from '../../hooks/analytics';
import { useCriticalReviews, useReviews } from '../../hooks/reviews';
import { ReviewsStackParamList } from '../../navigation/ReviewsNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import {
  filterOpenCriticalReviews,
  getCriticalReviewsEmptyStateMessage,
  isOpenComplaintStatus,
  isOpenCriticalReview,
} from '../../utils/reviewCritical';

type Nav = NativeStackNavigationProp<ReviewsStackParamList, 'ReviewsList'>;
type Props = NativeStackScreenProps<ReviewsStackParamList, 'ReviewsList'>;
type MetricKey = keyof MetricsHeatmapItem['metrics'];
interface OutletOption {
  id: string;
  label: string;
}

interface MetricTone {
  bg: string;
  border: string;
  text: string;
}

const METRIC_ORDER: MetricKey[] = ['staff', 'speed', 'clean', 'quality', 'overall'];
const METRIC_LABELS: Record<MetricKey, string> = {
  staff: 'Staff',
  speed: 'Speed',
  clean: 'Clean',
  quality: 'Quality',
  overall: 'Overall',
};
const ZERO_METRICS: MetricsHeatmapItem['metrics'] = {
  staff: 0,
  speed: 0,
  clean: 0,
  quality: 0,
  overall: 0,
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

function getSeverity(rating: number) {
  if (rating < 2.0) {
    return { label: 'CRITICAL', bg: colors.error, text: colors.textInverse };
  }
  if (rating < 3.5) {
    return { label: 'CONCERN', bg: colors.warning, text: colors.textInverse };
  }
  return { label: 'FEEDBACK', bg: colors.primary, text: colors.textInverse };
}

function getAllReviewCardBackground(review: Review) {
  if (review.complaintStatus === 'resolved') return '#ecfdf5';
  if (review.isComplaint) return '#fef2f2';
  if (review.overallRating < 2.5) return '#fefce8';
  return '#FFFFFF';
}

function getReviewTags(review: Review) {
  const tags: string[] = [];

  if (review.complaintReason && review.complaintReason.trim().length > 0) {
    tags.push(review.complaintReason);
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
        <Text style={styles.heatmapOutletName} numberOfLines={1}>
          {row.outletName}
        </Text>
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
              <Text style={[styles.metricCellLabel, { color: tone.text }]}>
                {METRIC_LABELS[metric]}
              </Text>
              <Text style={[styles.metricCellValue, { color: tone.text }]}>{percent}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ReviewsScreen({ route }: Props) {
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const navigation = useNavigation<Nav>();
  const [selectedOutletId, setSelectedOutletId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<ReviewMetricFilter>('all');
  const [allReviewsFilter, setAllReviewsFilter] = useState<
    'all' | 'open' | 'resolved' | 'critical' | 'concern'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim().toLowerCase());
    }, 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    const incomingMetric = route.params?.initialReviewFilter?.metric;
    if (incomingMetric) {
      queueMicrotask(() => setStatusFilter(incomingMetric));
    }
    const incomingTypeFilter = route.params?.initialReviewFilter?.typeFilter;
    if (incomingTypeFilter) {
      queueMicrotask(() => setAllReviewsFilter(incomingTypeFilter));
    }
    const incomingOutletId = route.params?.initialReviewFilter?.outletId;
    if (incomingOutletId) {
      queueMicrotask(() => setSelectedOutletId(incomingOutletId));
    }
  }, [
    route.params?.initialReviewFilter?.metric,
    route.params?.initialReviewFilter?.typeFilter,
    route.params?.initialReviewFilter?.outletId,
    route.params?.initialReviewFilter?.nonce,
  ]);

  const {
    data: reviews,
    isLoading: isReviewsLoading,
    isFetching: isReviewsFetching,
    refetch: refetchReviews,
  } = useReviews();
  const {
    data: criticalReviews,
    isLoading: isCriticalReviewsLoading,
    isFetching: isCriticalReviewsFetching,
    refetch: refetchCriticalReviews,
  } = useCriticalReviews();

  const {
    data: analytics,
    isLoading: isAnalyticsLoading,
    isFetching: isAnalyticsFetching,
    refetch: refetchAnalytics,
  } = useFranchiseAnalytics();

  const ranking = useMemo(() => analytics?.franchiseRanking ?? [], [analytics]);
  const heatmap = useMemo(() => analytics?.metricsHeatmap ?? [], [analytics]);
  const topRanking = ranking.slice(0, 3);

  const outletOptions = useMemo<OutletOption[]>(() => {
    const byOutlet = new Map<string, string>();

    for (const item of heatmap) {
      if (!byOutlet.has(item.outletId)) {
        byOutlet.set(item.outletId, item.outletName || 'Unknown Outlet');
      }
    }

    for (const review of reviews ?? []) {
      const key = review.outletId || `name:${review.outletName || 'Unknown Outlet'}`;
      if (!byOutlet.has(key)) {
        byOutlet.set(key, review.outletName || 'Unknown Outlet');
      }
    }

    if (byOutlet.size === 0) {
      return [{ id: 'all', label: 'All Outlets' }];
    }

    const options = Array.from(byOutlet.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ id: 'all', label: 'All Outlets' }, ...options];
  }, [reviews, heatmap]);

  useEffect(() => {
    if (selectedOutletId === 'all') return;
    if (!outletOptions.some((option) => option.id === selectedOutletId)) {
      queueMicrotask(() => setSelectedOutletId('all'));
    }
  }, [outletOptions, selectedOutletId]);

  const filteredReviews = useMemo(() => {
    if (!reviews) return [];
    const outletFiltered =
      selectedOutletId === 'all'
        ? reviews
        : reviews.filter((review) => {
            const outletKey = review.outletId || `name:${review.outletName || 'Unknown Outlet'}`;
            return outletKey === selectedOutletId;
          });

    if (statusFilter === 'open') {
      return outletFiltered.filter(
        (review) => review.isComplaint && isOpenComplaintStatus(review.complaintStatus),
      );
    }

    if (statusFilter === 'resolved') {
      return outletFiltered.filter(
        (review) => review.isComplaint && review.complaintStatus === 'resolved',
      );
    }

    return outletFiltered;
  }, [reviews, selectedOutletId, statusFilter]);

  const pendingCount = useMemo(
    () => filterOpenCriticalReviews(filteredReviews).length,
    [filteredReviews],
  );
  const hasUnresolvedComplaint = useMemo(
    () => filterOpenCriticalReviews(filteredReviews).length > 0,
    [filteredReviews],
  );

  const criticalFeed = useMemo(() => {
    const outletScopedCriticalReviews =
      selectedOutletId === 'all'
        ? (criticalReviews ?? [])
        : (criticalReviews ?? []).filter((review) => {
            const outletKey = review.outletId || `name:${review.outletName || 'Unknown Outlet'}`;
            return outletKey === selectedOutletId;
          });

    const sorted = [...outletScopedCriticalReviews].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [criticalReviews, selectedOutletId]);

  const allReviews = useMemo(
    () =>
      [...filteredReviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [filteredReviews],
  );

  const displayedAllReviews = useMemo(() => {
    return allReviews.filter((review) => {
      // Search filter
      if (debouncedSearchQuery) {
        const comment = review.userResponses
          ?.map((r) => (typeof r.answer === 'string' ? r.answer : ''))
          .join(' ')
          .toLowerCase();
        const customer = review.customerName?.toLowerCase() || '';
        const outlet = review.outletName?.toLowerCase() || '';

        const matches =
          comment.includes(debouncedSearchQuery) ||
          customer.includes(debouncedSearchQuery) ||
          outlet.includes(debouncedSearchQuery);

        if (!matches) return false;
      }

      // Status filter
      if (allReviewsFilter === 'all') return true;
      if (allReviewsFilter === 'open')
        return review.isComplaint && isOpenComplaintStatus(review.complaintStatus);
      if (allReviewsFilter === 'resolved')
        return review.isComplaint && review.complaintStatus === 'resolved';
      if (allReviewsFilter === 'critical') return isOpenCriticalReview(review);
      if (allReviewsFilter === 'concern')
        return review.overallRating >= 2.0 && review.overallRating < 3.5;
      return true;
    });
  }, [allReviews, allReviewsFilter, debouncedSearchQuery]);

  const heatmapRows = useMemo(() => {
    const scopedHeatmap =
      selectedOutletId === 'all'
        ? heatmap
        : heatmap.filter((item) => item.outletId === selectedOutletId);

    const heatmapByOutlet = new Map(scopedHeatmap.map((item) => [item.outletId, item]));

    const ordered = ranking
      .map((rankItem) => heatmapByOutlet.get(rankItem.outletId))
      .filter((item): item is MetricsHeatmapItem => Boolean(item));

    const rankedIds = new Set(ranking.map((item) => item.outletId));
    const extras = scopedHeatmap.filter((item) => !rankedIds.has(item.outletId));

    return [...ordered, ...extras];
  }, [heatmap, ranking, selectedOutletId]);

  const heatmapRowsWithFallback = useMemo(() => {
    if (heatmapRows.length > 0) return heatmapRows;

    const buildZeroRow = (id: string, label: string): MetricsHeatmapItem => ({
      outletId: id,
      outletName: label,
      metrics: { ...ZERO_METRICS },
    });

    if (selectedOutletId === 'all') {
      return outletOptions
        .filter((option) => option.id !== 'all')
        .map((option) => buildZeroRow(option.id, option.label));
    }

    const selectedOutlet = outletOptions.find((option) => option.id === selectedOutletId);
    if (!selectedOutlet) return [];
    return [buildZeroRow(selectedOutlet.id, selectedOutlet.label)];
  }, [heatmapRows, outletOptions, selectedOutletId]);

  const refreshing = isReviewsFetching || isCriticalReviewsFetching || isAnalyticsFetching;
  const activeStatusFilterLabel =
    statusFilter === 'open' ? 'Open' : statusFilter === 'resolved' ? 'Resolved' : null;
  const allReviewsEmptyMessage = getCriticalReviewsEmptyStateMessage(
    allReviewsFilter === 'critical',
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !isReviewsLoading}
            onRefresh={() => {
              void refetchReviews();
              void refetchCriticalReviews();
              void refetchAnalytics();
            }}
          />
        }
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.heading}>Reviews & Performance</Text>
            <Text style={styles.subheading}>
              Real-time franchise health and sentiment analysis.
            </Text>
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
            ) : topRanking.length === 0 ? (
              <Text style={styles.emptyText}>No franchise ranking available.</Text>
            ) : (
              <View style={styles.rankList}>
                {topRanking.map((item) => (
                  <RankingItemRow key={item.outletId} item={item} />
                ))}
              </View>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <View style={{ marginHorizontal: spacing.md }}>
              <TouchableOpacity
                style={styles.outletSelectBtn}
                onPress={() => setShowOutletModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.outletSelectBtnText} numberOfLines={1}>
                  {outletOptions.find((opt) => opt.id === selectedOutletId)?.label || 'All Outlets'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>Outlet Performance Heatmap</Text>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentGreenBright }]} />
                  <Text style={styles.legendText}>Good</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentGold }]} />
                  <Text style={styles.legendText}>Mid</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.accentRed }]} />
                  <Text style={styles.legendText}>Alert</Text>
                </View>
              </View>
            </View>

            {isAnalyticsLoading ? (
              <ActivityIndicator color={colors.primary} style={styles.loading} />
            ) : heatmapRowsWithFallback.length === 0 ? (
              <Text style={styles.emptyText}>No heatmap metrics available.</Text>
            ) : selectedOutletId === 'all' ? (
              <ScrollView
                style={{ maxHeight: 304 }}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.heatmapList}>
                  {heatmapRowsWithFallback.map((row) => (
                    <HeatmapRow key={row.outletId} row={row} />
                  ))}
                </View>
              </ScrollView>
            ) : (
              <View style={styles.heatmapList}>
                {heatmapRowsWithFallback.map((row) => (
                  <HeatmapRow key={row.outletId} row={row} />
                ))}
              </View>
            )}
          </View>
        </View>

        {statusFilter !== 'all' && (
          <View style={styles.activeFilterRow}>
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterText}>Filter: {activeStatusFilterLabel}</Text>
              <TouchableOpacity
                onPress={() => setStatusFilter('all')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Clear review status filter"
                style={styles.activeFilterClearBtn}
              >
                <Ionicons name="close" size={14} color={colors.primaryDark} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {hasUnresolvedComplaint && (
          <>
            <View style={styles.feedbackHeaderRow}>
              <Text style={styles.sectionEyebrow}>Critical Feedback Feed</Text>
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>{pendingCount} URGENT</Text>
              </View>
            </View>

            <View style={styles.feedbackContainer}>
              {isReviewsLoading || isCriticalReviewsLoading ? (
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
        )}

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
              style={[
                styles.filterIconBtn,
                allReviewsFilter !== 'all' && styles.filterIconBtnActive,
              ]}
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
          {isReviewsLoading ? (
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
                      <Text style={styles.feedbackAge}>
                        • {formatRelativeTime(review.createdAt)}
                      </Text>
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
      </ScrollView>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.filterModalScrim}
            onPress={() => setShowFilterModal(false)}
          />
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetTop}>
              <View style={styles.filterSheetHandle} />
              <View style={styles.filterSheetHeader}>
                <Text style={styles.filterSheetTitle}>Filter Reviews</Text>
                <TouchableOpacity
                  style={styles.filterSheetClose}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterBody}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status & Type</Text>
                <View style={styles.filterOptionsGrid}>
                  {(['all', 'open', 'resolved', 'critical', 'concern'] as const).map((opt) => {
                    const active = opt === allReviewsFilter;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.filterOption, active && styles.filterOptionActive]}
                        onPress={() => {
                          setAllReviewsFilter(opt);
                          setShowFilterModal(false);
                        }}
                      >
                        <Text
                          style={[styles.filterOptionText, active && styles.filterOptionTextActive]}
                        >
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </Text>
                        {active && (
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterFooter}>
                <TouchableOpacity
                  style={styles.filterClearBtn}
                  onPress={() => {
                    setAllReviewsFilter('all');
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={styles.filterClearBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showOutletModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOutletModal(false)}
      >
        <View style={styles.filterModalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.filterModalScrim}
            onPress={() => setShowOutletModal(false)}
          />
          <View style={styles.filterSheet}>
            <View style={styles.filterSheetTop}>
              <View style={styles.filterSheetHandle} />
              <View style={styles.filterSheetHeader}>
                <Text style={styles.filterSheetTitle}>Select Outlet</Text>
                <TouchableOpacity
                  style={styles.filterSheetClose}
                  onPress={() => setShowOutletModal(false)}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.filterBody, { maxHeight: 400, paddingBottom: 0 }]}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
              >
                <View style={styles.filterOptionsGrid}>
                  {outletOptions.map((opt) => {
                    const active = opt.id === selectedOutletId;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[
                          styles.filterOption,
                          active && styles.filterOptionActive,
                          { minWidth: '100%' },
                        ]}
                        onPress={() => {
                          setSelectedOutletId(opt.id);
                          if (opt.id === 'all') {
                            setStatusFilter('all');
                            setAllReviewsFilter('all');
                          }
                          setShowOutletModal(false);
                        }}
                      >
                        <Text
                          style={[styles.filterOptionText, active && styles.filterOptionTextActive]}
                        >
                          {opt.label}
                        </Text>
                        {active && (
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
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
    color: colors.accentBrownText,
  },

  rankList: {
    gap: spacing.sm,
  },
  rankRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha16,
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
    color: colors.warmBorder,
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
    color: colors.accentBrownText,
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
    backgroundColor: colors.uiGray1,
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
  activeFilterRow: {
    paddingHorizontal: spacing.xs,
  },
  activeFilterChip: {
    alignSelf: 'flex-start',
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintStrong,
    paddingLeft: spacing.sm,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterText: {
    fontSize: typography.xs,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  activeFilterClearBtn: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.whiteAlpha50,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha16,
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

  // Search & Filter Styles
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

  // Metric Filter Chip
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

  // Modal Styles
  filterModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimBlack50,
  },
  filterSheet: {
    backgroundColor: colors.screenBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  filterSheetTop: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  filterSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  filterSheetTitle: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: colors.text,
  },
  filterSheetClose: {
    padding: 4,
  },
  filterBody: {
    padding: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterSectionTitle: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: '47%',
  },
  filterOptionActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintStrong,
  },
  filterOptionText: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
    flex: 1,
  },
  filterOptionTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  filterFooter: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  filterClearBtn: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.uiGray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterClearBtnText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
  outletSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  outletSelectBtnText: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
    flex: 1,
  },
});
