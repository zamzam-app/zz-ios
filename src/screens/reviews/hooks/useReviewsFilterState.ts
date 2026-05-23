import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';

import { MetricsHeatmapItem } from '../../../api/endpoints/analytics';
import { Review } from '../../../api/endpoints/reviews';
import { ReviewMetricFilter } from '../../../constants/reviewFilters';
import { useFranchiseAnalytics } from '../../../hooks/analytics';
import { useCriticalReviews, useReviews } from '../../../hooks/reviews';
import { ReviewsStackParamList } from '../../../navigation/ReviewsNavigator';
import { colors } from '../../../theme/theme';
import {
  filterOpenCriticalReviews,
  getCriticalReviewsEmptyStateMessage,
  isOpenComplaintStatus,
  isOpenCriticalReview,
} from '../../../utils/reviewCritical';

export type MetricKey = keyof MetricsHeatmapItem['metrics'];
export interface OutletOption {
  id: string;
  label: string;
}

export const METRIC_ORDER: MetricKey[] = ['staff', 'speed', 'clean', 'quality', 'overall'];
export const METRIC_LABELS: Record<MetricKey, string> = {
  staff: 'Staff',
  speed: 'Speed',
  clean: 'Clean',
  quality: 'Quality',
  overall: 'Overall',
};
export const ZERO_METRICS: MetricsHeatmapItem['metrics'] = {
  staff: 0,
  speed: 0,
  clean: 0,
  quality: 0,
  overall: 0,
};

export function scoreToPercent(score: number | null | undefined) {
  const safe = score ?? 0;
  return Math.max(0, Math.min(100, Math.round((safe / 5) * 100)));
}

export interface MetricTone {
  bg: string;
  border: string;
  text: string;
}

export function getMetricTone(percent: number): MetricTone {
  if (percent >= 85) {
    return { bg: '#DCFCE7', border: '#BBF7D0', text: '#15803D' };
  }
  if (percent >= 65) {
    return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309' };
  }
  return { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' };
}

export function formatRelativeTime(iso: string) {
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

export function getComment(review: Review) {
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

export function getSeverity(rating: number) {
  if (rating < 2.0) {
    return { label: 'CRITICAL', bg: colors.error, text: colors.textInverse };
  }
  if (rating < 3.5) {
    return { label: 'CONCERN', bg: colors.warning, text: colors.textInverse };
  }
  return { label: 'FEEDBACK', bg: colors.primary, text: colors.textInverse };
}

export function getAllReviewCardBackground(review: Review) {
  if (review.complaintStatus === 'resolved') return '#ecfdf5';
  if (review.isComplaint) return '#fef2f2';
  if (review.overallRating < 2.5) return '#fefce8';
  return '#FFFFFF';
}

export function getReviewTags(review: Review) {
  const tags: string[] = [];
  if (review.complaintReason && review.complaintReason.trim().length > 0) {
    tags.push(review.complaintReason);
  }
  return tags.slice(0, 2);
}

type Props = NativeStackScreenProps<ReviewsStackParamList, 'ReviewsList'>;

export function useReviewsFilterState(route: Props['route']) {
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

  const handleRefresh = () => {
    void refetchReviews();
    void refetchCriticalReviews();
    void refetchAnalytics();
  };

  return {
    // State
    selectedOutletId,
    setSelectedOutletId,
    statusFilter,
    setStatusFilter,
    allReviewsFilter,
    setAllReviewsFilter,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    showFilterModal,
    setShowFilterModal,
    showOutletModal,
    setShowOutletModal,
    // Data
    reviews,
    criticalReviews,
    analytics,
    ranking,
    heatmap,
    topRanking,
    outletOptions,
    filteredReviews,
    pendingCount,
    hasUnresolvedComplaint,
    criticalFeed,
    allReviews,
    displayedAllReviews,
    heatmapRows,
    heatmapRowsWithFallback,
    // Loading
    isReviewsLoading,
    isCriticalReviewsLoading,
    isAnalyticsLoading,
    refreshing,
    // Derived UI
    activeStatusFilterLabel,
    allReviewsEmptyMessage,
    // Actions
    handleRefresh,
  };
}
