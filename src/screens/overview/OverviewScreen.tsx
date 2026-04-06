import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Line, Text as SvgText } from 'react-native-svg';
import {
  useQuickInsights,
  useGlobalCsat,
  useCsatTrendline,
  useIncidentsOverview,
  useOutletFeedbackSummary,
} from '../../hooks/useAnalytics';
import { Period } from '../../api/endpoints/analytics';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

// ─── Period Selector ─────────────────────────────────────────────────────────

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <View style={styles.periodRow}>
      {PERIODS.map((p) => (
        <TouchableOpacity
          key={p.value}
          style={[styles.periodBtn, value === p.value && styles.periodBtnActive]}
          onPress={() => onChange(p.value)}
        >
          <Text style={[styles.periodBtnText, value === p.value && styles.periodBtnTextActive]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: accent }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// ─── CSAT Trendline Chart ─────────────────────────────────────────────────────

function TrendlineChart({ current, previous }: {
  current: number[];
  previous: number[];
}) {
  const W = 320;
  const H = 140;
  const PAD = { top: 10, bottom: 24, left: 28, right: 10 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const toPoints = (values: number[]) => {
    if (values.length < 2) return '';
    return values
      .map((v, i) => {
        const x = PAD.left + (i / (values.length - 1)) * chartW;
        const y = PAD.top + chartH - ((v / 5) * chartH);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const yLabels = [0, 1, 2, 3, 4, 5];

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.textSecondary }]} />
          <Text style={styles.legendText}>Previous</Text>
        </View>
      </View>
      <Svg width={W} height={H}>
        {yLabels.map((y) => {
          const cy = PAD.top + chartH - ((y / 5) * chartH);
          return (
            <React.Fragment key={y}>
              <Line x1={PAD.left} y1={cy} x2={W - PAD.right} y2={cy} stroke={colors.border} strokeWidth={0.5} />
              <SvgText x={PAD.left - 4} y={cy + 4} fontSize={9} fill={colors.textSecondary} textAnchor="end">{y}</SvgText>
            </React.Fragment>
          );
        })}
        {previous.length > 1 && (
          <Polyline points={toPoints(previous)} fill="none" stroke={colors.textSecondary} strokeWidth={1.5} strokeDasharray="4,3" />
        )}
        {current.length > 1 && (
          <Polyline points={toPoints(current)} fill="none" stroke={colors.success} strokeWidth={2} />
        )}
      </Svg>
    </View>
  );
}

// ─── Outlet Feedback Row ──────────────────────────────────────────────────────

function OutletRow({ name, value, accent }: { name: string; value: number; accent: string }) {
  return (
    <View style={styles.outletRow}>
      <Text style={styles.outletName} numberOfLines={1}>{name}</Text>
      <View style={[styles.outletBadge, { backgroundColor: accent + '22' }]}>
        <Text style={[styles.outletBadgeText, { color: accent }]}>{value}</Text>
      </View>
    </View>
  );
}

function FeedbackCard({ title, accent, items }: { title: string; accent: string; items: { name: string; value: number }[] }) {
  return (
    <View style={[styles.feedbackCard, { borderTopColor: accent }]}>
      <Text style={styles.feedbackCardTitle}>{title}</Text>
      {items.slice(0, 4).map((item, i) => (
        <OutletRow key={i} name={item.name} value={item.value} accent={accent} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OverviewScreen() {
  const [period, setPeriod] = useState<Period>('weekly');

  const insights = useQuickInsights(period);
  const csat = useGlobalCsat(period);
  const trendline = useCsatTrendline(period);
  const incidents = useIncidentsOverview(period);
  const feedback = useOutletFeedbackSummary(period);

  const isLoading = insights.isLoading || csat.isLoading || trendline.isLoading || incidents.isLoading || feedback.isLoading;
  const isRefreshing = insights.isFetching || csat.isFetching || trendline.isFetching || incidents.isFetching || feedback.isFetching;

  const refetchAll = () => {
    insights.refetch();
    csat.refetch();
    trendline.refetch();
    incidents.refetch();
    feedback.refetch();
  };

  const csatScore = csat.data?.globalCsatScore ?? '--';
  const totalRatings = csat.data?.totalRatings ?? 0;

  const negativeSorted = [...(feedback.data?.items ?? [])].sort((a, b) => b.negativeFeedbacks - a.negativeFeedbacks);
  const totalSorted = [...(feedback.data?.items ?? [])].sort((a, b) => b.totalFeedbacks - a.totalFeedbacks);
  const resolvedSorted = [...(feedback.data?.items ?? [])].sort((a, b) => b.resolvedFeedbacks - a.resolvedFeedbacks);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isLoading} onRefresh={refetchAll} />}
      >
        <Text style={styles.heading}>Overview</Text>

        <PeriodSelector value={period} onChange={setPeriod} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
        ) : (
          <>
            {/* CSAT Score */}
            <View style={styles.card}>
              <Text style={styles.csatScore}>{csatScore}</Text>
              <Text style={styles.csatSuffix}>/5</Text>
              <Text style={styles.csatLabel}>Global CSAT · {totalRatings} ratings</Text>
            </View>

            {/* Incidents */}
            <SectionHeader title="Incidents" />
            <View style={styles.statRow}>
              <StatCard label="Open" value={incidents.data?.totalOpenIncidents ?? '--'} accent={colors.warning} />
              <StatCard label="Critical" value={incidents.data?.criticalIssues ?? '--'} accent={colors.error} />
              <StatCard label="Resolved Today" value={incidents.data?.incidentsResolvedToday ?? '--'} accent={colors.success} />
            </View>

            {/* Quick Insights */}
            <SectionHeader title="Quick Insights" />
            <View style={styles.insightRow}>
              {insights.data?.peakIncidentTime && (
                <View style={[styles.insightCard, { borderLeftColor: colors.warning }]}>
                  <Text style={styles.insightTitle}>Peak Incident Time</Text>
                  <Text style={styles.insightValue}>{insights.data.peakIncidentTime.label}</Text>
                </View>
              )}
              {insights.data?.mostImprovedOutlet && (
                <View style={[styles.insightCard, { borderLeftColor: colors.success }]}>
                  <Text style={styles.insightTitle}>Most Improved</Text>
                  <Text style={styles.insightValue}>
                    {insights.data.mostImprovedOutlet.outletName}{' '}
                    ({insights.data.mostImprovedOutlet.improvement >= 0 ? '+' : ''}
                    {insights.data.mostImprovedOutlet.improvement.toFixed(1)})
                  </Text>
                </View>
              )}
              {insights.data?.criticalFocusArea && (
                <View style={[styles.insightCard, { borderLeftColor: colors.error }]}>
                  <Text style={styles.insightTitle}>Critical Focus</Text>
                  <Text style={styles.insightValue}>
                    {insights.data.criticalFocusArea.outletName}{' '}
                    ({insights.data.criticalFocusArea.criticalIssues} issue{insights.data.criticalFocusArea.criticalIssues !== 1 ? 's' : ''})
                  </Text>
                </View>
              )}
            </View>

            {/* CSAT Trendline */}
            <SectionHeader title="CSAT Trendline" />
            <View style={styles.card}>
              {trendline.data ? (
                <TrendlineChart
                  current={trendline.data.currentPeriod.values}
                  previous={trendline.data.previousPeriod.values}
                />
              ) : (
                <Text style={styles.empty}>No trendline data</Text>
              )}
            </View>

            {/* Outlet Feedback Summary */}
            <SectionHeader title="Outlet Feedback" />
            <FeedbackCard
              title="Negative Feedbacks"
              accent={colors.error}
              items={negativeSorted.map((i) => ({ name: i.outletName, value: i.negativeFeedbacks }))}
            />
            <FeedbackCard
              title="Total Feedbacks"
              accent={colors.warning}
              items={totalSorted.map((i) => ({ name: i.outletName, value: i.totalFeedbacks }))}
            />
            <FeedbackCard
              title="Resolved"
              accent={colors.success}
              items={resolvedSorted.map((i) => ({ name: i.outletName, value: i.resolvedFeedbacks }))}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Period
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  periodBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodBtnText: { fontSize: typography.sm, color: colors.textSecondary, fontWeight: typography.medium },
  periodBtnTextActive: { color: colors.textInverse },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },

  // CSAT
  csatScore: {
    fontSize: 64,
    fontWeight: typography.bold,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 72,
  },
  csatSuffix: {
    fontSize: typography.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  csatLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Section
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },

  // Stat row
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    ...shadow.sm,
  },
  statValue: { fontSize: typography.xl, fontWeight: typography.bold, color: colors.text },
  statLabel: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },

  // Insights
  insightRow: { gap: spacing.sm, marginBottom: spacing.md },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    ...shadow.sm,
  },
  insightTitle: { fontSize: typography.xs, color: colors.textSecondary, marginBottom: 4 },
  insightValue: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },

  // Chart
  chartWrap: { alignItems: 'center' },
  chartLegend: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm, alignSelf: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: typography.xs, color: colors.textSecondary },

  // Feedback cards
  feedbackCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderTopWidth: 3,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  feedbackCardTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  outletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  outletName: { fontSize: typography.sm, color: colors.text, flex: 1, marginRight: spacing.sm },
  outletBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  outletBadgeText: { fontSize: typography.xs, fontWeight: typography.semibold },

  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md },
});
