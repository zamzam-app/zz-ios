import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useReviews } from '../../hooks/useReviews';
import { useOutlets } from '../../hooks/useOutlets';
import { useFranchiseAnalytics } from '../../hooks/useAnalytics';
import { Review, ComplaintStatus } from '../../api/endpoints/reviews';
import { FranchiseRankingItem, MetricsHeatmapItem, Period } from '../../api/endpoints/analytics';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { ReviewsStackParamList } from '../../navigation/ReviewsNavigator';
import StarRating from '../../components/StarRating';

type Nav = NativeStackNavigationProp<ReviewsStackParamList, 'ReviewsList'>;
type ComplaintFilter = 'all' | 'pending' | 'resolved';

const COMPLAINT_FILTERS: { label: string; value: ComplaintFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
];

const COMPLAINT_STATUS_COLORS: Record<ComplaintStatus, string> = {
  pending: colors.warning,
  resolved: colors.success,
  dismissed: colors.textSecondary,
};

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const METRICS: { key: keyof MetricsHeatmapItem['metrics']; label: string; color: string }[] = [
  { key: 'overall', label: 'Overall', color: colors.primary },
  { key: 'staff', label: 'Staff', color: colors.success },
  { key: 'speed', label: 'Speed', color: colors.warning },
  { key: 'clean', label: 'Cleanliness', color: colors.info },
  { key: 'quality', label: 'Quality', color: colors.statusReadyForReview },
];

// ─── Metric Bar ───────────────────────────────────────────────────────────────

function MetricBar({ label, value, color }: { label: string; value: number | null | undefined; color: string }) {
  const v = value ?? 0;
  const pct = Math.min((v / 5) * 100, 100);
  return (
    <View style={mStyles.metricRow}>
      <Text style={mStyles.metricLabel}>{label}</Text>
      <View style={mStyles.barTrack}>
        <View style={[mStyles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[mStyles.metricValue, { color }]}>{v.toFixed(1)}</Text>
    </View>
  );
}

// ─── Outlet Metrics Modal ─────────────────────────────────────────────────────

function OutletMetricsModal({
  visible,
  ranking,
  heatmap,
  onClose,
}: {
  visible: boolean;
  ranking: FranchiseRankingItem | null;
  heatmap: MetricsHeatmapItem | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={mStyles.modalHeader}>
          <View />
          <Text style={mStyles.modalTitle} numberOfLines={1}>{ranking?.outletName ?? ''}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary }}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={mStyles.modalBody}>
          {/* Rank + CSAT */}
          <View style={mStyles.scoreRow}>
            <View style={mStyles.rankBox}>
              <Text style={mStyles.rankNum}>#{ranking?.rank}</Text>
              <Text style={mStyles.rankLabel}>Rank</Text>
            </View>
            <View style={mStyles.csatBox}>
              <Text style={mStyles.csatNum}>{(ranking?.csatScore ?? 0).toFixed(2)}</Text>
              <Text style={mStyles.csatLabel}>CSAT Score</Text>
            </View>
          </View>

          {ranking?.managerNames && ranking.managerNames.length > 0 && (
            <Text style={mStyles.managers}>
              Managed by: {ranking.managerNames.join(', ')}
            </Text>
          )}

          {/* Metrics bars */}
          <Text style={mStyles.sectionTitle}>Performance Metrics</Text>
          <View style={mStyles.barsCard}>
            {heatmap ? (
              METRICS.map((m) => (
                <MetricBar
                  key={m.key}
                  label={m.label}
                  value={heatmap.metrics[m.key]}
                  color={m.color}
                />
              ))
            ) : (
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                No metrics data available
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Franchise Ranking Section ────────────────────────────────────────────────

function FranchiseRanking({
  period,
  onSelectOutlet,
}: {
  period: Period;
  onSelectOutlet: (ranking: FranchiseRankingItem, heatmap: MetricsHeatmapItem | null) => void;
}) {
  const { data, isLoading } = useFranchiseAnalytics(period);

  const heatmapMap = useMemo(() => {
    const map: Record<string, MetricsHeatmapItem> = {};
    (data?.metricsHeatmap ?? []).forEach((h) => { map[h.outletId] = h; });
    return map;
  }, [data]);

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />;
  if (!data?.franchiseRanking?.length) return null;

  return (
    <View style={styles.rankingSection}>
      <Text style={styles.rankingTitle}>Franchise Ranking</Text>
      <Text style={styles.rankingSubtitle}>Sorted by CSAT · tap for metrics</Text>
      {data.franchiseRanking.map((item, index) => (
        <GHTouchableOpacity
          key={item.outletId}
          style={[styles.rankingRow, index < data.franchiseRanking.length - 1 && styles.rankingRowBorder]}
          onPress={() => onSelectOutlet(item, heatmapMap[item.outletId] ?? null)}
          activeOpacity={0.7}
        >
          <Text style={styles.rankNum}>#{item.rank}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rankOutletName}>{item.outletName}</Text>
            {item.managerNames && item.managerNames.length > 0 && (
              <Text style={styles.rankManagers} numberOfLines={1}>{item.managerNames.join(', ')}</Text>
            )}
          </View>
          <View style={styles.csatPill}>
            <Text style={styles.csatPillText}>{(item.csatScore ?? 0).toFixed(2)}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </GHTouchableOpacity>
      ))}
    </View>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review, onPress }: { review: Review; onPress: () => void }) {
  const firstTextAnswer = review.userResponses.find((r) => typeof r.answer === 'string' && r.answer.trim());
  const comment = typeof firstTextAnswer?.answer === 'string' ? firstTextAnswer.answer : '';
  const borderColor = review.isComplaint && review.complaintStatus
    ? COMPLAINT_STATUS_COLORS[review.complaintStatus]
    : colors.border;

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: borderColor, borderLeftWidth: 3 }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{review.customerName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.customerName}>{review.customerName}</Text>
          <Text style={styles.outletName}>{review.outletName}</Text>
        </View>
        <View style={styles.cardRight}>
          <StarRating rating={review.overallRating} size={12} />
          <Text style={styles.date}>
            {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>
      {comment ? <Text style={styles.comment} numberOfLines={2}>{comment}</Text> : null}
      {review.isComplaint && review.complaintStatus && (
        <View style={[styles.complaintBadge, { backgroundColor: borderColor + '22' }]}>
          <Text style={[styles.complaintBadgeText, { color: borderColor }]}>{review.complaintStatus.toUpperCase()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReviewsScreen() {
  const navigation = useNavigation<Nav>();
  const [complaintFilter, setComplaintFilter] = useState<ComplaintFilter>('all');
  const [outletFilter, setOutletFilter] = useState<string | undefined>();
  const [rankingPeriod, setRankingPeriod] = useState<Period>('weekly');
  const [selectedRanking, setSelectedRanking] = useState<FranchiseRankingItem | null>(null);
  const [selectedHeatmap, setSelectedHeatmap] = useState<MetricsHeatmapItem | null>(null);

  const { data: reviews, isLoading, isFetching, refetch } = useReviews({
    limit: 100,
    ...(outletFilter && { outletId: outletFilter }),
  });
  const { data: outlets } = useOutlets();

  const pendingCount = useMemo(
    () => reviews?.filter((r) => r.isComplaint && r.complaintStatus === 'pending').length ?? 0,
    [reviews],
  );

  const filtered = useMemo(() => {
    if (!reviews) return [];
    if (complaintFilter === 'all') return reviews;
    return reviews.filter((r) => r.isComplaint && r.complaintStatus === complaintFilter);
  }, [reviews, complaintFilter]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <OutletMetricsModal
        visible={selectedRanking !== null}
        ranking={selectedRanking}
        heatmap={selectedHeatmap}
        onClose={() => { setSelectedRanking(null); setSelectedHeatmap(null); }}
      />
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.heading}>Reviews</Text>
                {pendingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingCount}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Complaint filter */}
            <View style={styles.filterRow}>
              {COMPLAINT_FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.filterChip, complaintFilter === f.value && styles.filterChipActive]}
                  onPress={() => setComplaintFilter(f.value)}
                >
                  <Text style={[styles.filterChipText, complaintFilter === f.value && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Outlet filter */}
            {outlets && outlets.length > 0 && (
              <FlatList
                horizontal
                data={[{ id: undefined, name: 'All Outlets' }, ...outlets]}
                keyExtractor={(o) => o.id ?? 'all'}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.outletFilterRow}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.filterChip, outletFilter === item.id && styles.filterChipActive]}
                    onPress={() => setOutletFilter(item.id)}
                  >
                    <Text style={[styles.filterChipText, outletFilter === item.id && styles.filterChipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Franchise Ranking */}
            <View style={styles.rankingPeriodRow}>
              <Text style={styles.rankingSectionHeading}>Franchise Ranking</Text>
              <View style={styles.periodPills}>
                {PERIODS.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    style={[styles.periodPill, rankingPeriod === p.value && styles.periodPillActive]}
                    onPress={() => setRankingPeriod(p.value)}
                  >
                    <Text style={[styles.periodPillText, rankingPeriod === p.value && styles.periodPillTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <FranchiseRanking
              period={rankingPeriod}
              onSelectOutlet={(ranking, heatmap) => {
                setSelectedRanking(ranking);
                setSelectedHeatmap(heatmap);
              }}
            />

            <Text style={styles.reviewsHeading}>All Reviews</Text>

            {isLoading && <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />}
          </>
        }
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            onPress={() => navigation.navigate('ReviewDetail', { reviewId: item.id })}
          />
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No reviews found</Text> : null}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xxl },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heading: { fontSize: typography.xl, fontWeight: typography.bold, color: colors.text },
  badge: { backgroundColor: colors.error, borderRadius: radius.full, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: colors.textInverse, fontSize: typography.xs, fontWeight: typography.bold },

  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  outletFilterRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: typography.sm, color: colors.textSecondary },
  filterChipTextActive: { color: colors.textInverse, fontWeight: typography.medium },

  rankingPeriodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  rankingSectionHeading: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  periodPills: { flexDirection: 'row', gap: spacing.xs },
  periodPill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  periodPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodPillText: { fontSize: typography.xs, color: colors.textSecondary },
  periodPillTextActive: { color: colors.textInverse, fontWeight: typography.medium },

  rankingSection: { backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: spacing.md, marginBottom: spacing.md, ...shadow.sm, overflow: 'hidden' },
  rankingTitle: { fontSize: typography.base, fontWeight: typography.bold, color: colors.text, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  rankingSubtitle: { fontSize: typography.xs, color: colors.textSecondary, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  rankingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm },
  rankingRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rankNum: { fontSize: typography.base, fontWeight: typography.bold, color: colors.textSecondary, width: 28 },
  rankOutletName: { fontSize: typography.sm, fontWeight: typography.semibold, color: colors.text },
  rankManagers: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  csatPill: { backgroundColor: colors.primary + '18', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  csatPillText: { fontSize: typography.sm, fontWeight: typography.bold, color: colors.primary },
  chevron: { fontSize: 18, color: colors.textSecondary },

  reviewsHeading: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text, paddingHorizontal: spacing.md, marginBottom: spacing.sm },

  list2: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  avatarText: { color: colors.primary, fontWeight: typography.bold, fontSize: typography.base },
  cardMeta: { flex: 1 },
  customerName: { fontSize: typography.sm, fontWeight: typography.semibold, color: colors.text },
  outletName: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  date: { fontSize: typography.xs, color: colors.textSecondary },
  comment: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.sm },
  complaintBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  complaintBadgeText: { fontSize: typography.xs, fontWeight: typography.semibold },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl, paddingHorizontal: spacing.md },
});

const mStyles = StyleSheet.create({
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text, flex: 1, textAlign: 'center' },
  modalBody: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  scoreRow: { flexDirection: 'row', gap: spacing.md },
  rankBox: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  rankNum: { fontSize: typography.xxl, fontWeight: typography.bold, color: colors.text },
  rankLabel: { fontSize: typography.xs, color: colors.textSecondary },
  csatBox: { flex: 1, backgroundColor: colors.primary + '12', borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  csatNum: { fontSize: typography.xxl, fontWeight: typography.bold, color: colors.primary },
  csatLabel: { fontSize: typography.xs, color: colors.primary },

  managers: { fontSize: typography.sm, color: colors.textSecondary },

  sectionTitle: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  barsCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },

  metricRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metricLabel: { fontSize: typography.sm, color: colors.textSecondary, width: 80 },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.surfaceElevated, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },
  metricValue: { fontSize: typography.sm, fontWeight: typography.bold, width: 32, textAlign: 'right' },
});
