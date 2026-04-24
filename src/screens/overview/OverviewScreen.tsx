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
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import {
  useQuickInsights,
  useGlobalCsat,
  useCsatTrendline,
  useIncidentsOverview,
  useOutletFeedbackSummary,
} from '../../hooks/useAnalytics';
import { Period } from '../../api/endpoints/analytics';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

// ─── Floating Period Selector ─────────────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const [open, setOpen] = useState(false);
  const active = PERIODS.find((p) => p.value === value)!;

  return (
    <View style={styles.periodWrap}>
      <TouchableOpacity
        style={styles.periodBtn}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.8}
      >
        <Text style={styles.periodBtnText}>{active.label}</Text>
        <Text style={styles.periodChevron}>{open ? '▲' : '▾'}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.periodDropdown}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.periodOption, p.value === value && styles.periodOptionActive]}
              onPress={() => { onChange(p.value); setOpen(false); }}
            >
              <Text style={[styles.periodOptionText, p.value === value && styles.periodOptionTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── CSAT Hero Card ───────────────────────────────────────────────────────────

function CsatHeroCard({ score, totalRatings }: { score: number | string; totalRatings: number }) {
  const scoreStr = typeof score === 'number' ? score.toFixed(1) : score;
  return (
    <View style={styles.heroCard}>
      <Text style={styles.heroScore}>{scoreStr}<Text style={styles.heroSuffix}>/5</Text></Text>
      <Text style={styles.heroLabel}>Overall CSAT Score</Text>
      <Text style={styles.heroSub}>{totalRatings} ratings this period</Text>
    </View>
  );
}

// ─── Stat Pills ───────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={[styles.statPill, { backgroundColor: color + '18' }]}>
      <Text style={[styles.statPillValue, { color }]}>{value}</Text>
      <Text style={[styles.statPillLabel, { color: color + 'AA' }]}>{label}</Text>
    </View>
  );
}

// ─── Insight Cards (swipeable row) ────────────────────────────────────────────

function InsightRow({ insights }: { insights: { title: string; value: string; accent: string }[] }) {
  if (!insights.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightScroll}>
      {insights.map((item, i) => (
        <View key={i} style={[styles.insightCard, { backgroundColor: item.accent + '18' }]}>
          <Text style={styles.insightTitle}>{item.title}</Text>
          <Text style={[styles.insightValue, { color: item.accent }]}>{item.value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Trendline Chart ──────────────────────────────────────────────────────────

function TrendlineChart({ current, previous }: { current: number[]; previous: number[] }) {
  const W = 300;
  const H = 130;
  const PAD = { top: 12, bottom: 20, left: 24, right: 8 };
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

  const lastCurrent = current.length > 0 ? current[current.length - 1] : null;
  const lastX = lastCurrent !== null ? PAD.left + chartW : 0;
  const lastY = lastCurrent !== null ? PAD.top + chartH - ((lastCurrent / 5) * chartH) : 0;

  return (
    <View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
          <Text style={styles.legendText}>Previous</Text>
        </View>
      </View>
      <Svg width={W} height={H}>
        {[0, 1, 2, 3, 4, 5].map((y) => {
          const cy = PAD.top + chartH - ((y / 5) * chartH);
          return (
            <React.Fragment key={y}>
              <Line x1={PAD.left} y1={cy} x2={W - PAD.right} y2={cy} stroke={colors.border} strokeWidth={0.5} />
              <SvgText x={PAD.left - 4} y={cy + 4} fontSize={9} fill={colors.textSecondary} textAnchor="end">{y}</SvgText>
            </React.Fragment>
          );
        })}
        {previous.length > 1 && (
          <Polyline points={toPoints(previous)} fill="none" stroke={colors.border} strokeWidth={1.5} strokeDasharray="4,3" />
        )}
        {current.length > 1 && (
          <Polyline points={toPoints(current)} fill="none" stroke={colors.primary} strokeWidth={2.5} />
        )}
        {lastCurrent !== null && current.length > 1 && (
          <Circle cx={lastX} cy={lastY} r={4} fill={colors.primary} />
        )}
      </Svg>
    </View>
  );
}

// ─── Feedback Section ─────────────────────────────────────────────────────────

function FeedbackCard({ title, accent, items }: { title: string; accent: string; items: { name: string; value: number }[] }) {
  return (
    <View style={[styles.feedbackCard, { backgroundColor: accent + '18' }]}>
      <Text style={[styles.feedbackTitle, { color: accent }]}>{title}</Text>
      {items.slice(0, 4).map((item, i) => (
        <View key={i} style={styles.feedbackRow}>
          <Text style={styles.feedbackName} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.feedbackBadge, { backgroundColor: accent + '18' }]}>
            <Text style={[styles.feedbackBadgeText, { color: accent }]}>{item.value}</Text>
          </View>
        </View>
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

  const isLoading = insights.isLoading || csat.isLoading;
  const isRefreshing = insights.isFetching || csat.isFetching || trendline.isFetching;

  const refetchAll = () => {
    insights.refetch(); csat.refetch(); trendline.refetch();
    incidents.refetch(); feedback.refetch();
  };

  const csatScore = csat.data?.globalCsatScore ?? '--';
  const totalRatings = csat.data?.totalRatings ?? 0;

  const insightItems = [
    insights.data?.peakIncidentTime && {
      title: 'Peak Incident Time',
      value: insights.data.peakIncidentTime.label,
      accent: colors.warning,
    },
    insights.data?.mostImprovedOutlet && {
      title: 'Most Improved',
      value: `${insights.data.mostImprovedOutlet.outletName} (${insights.data.mostImprovedOutlet.improvement >= 0 ? '+' : ''}${insights.data.mostImprovedOutlet.improvement.toFixed(1)})`,
      accent: colors.success,
    },
    insights.data?.criticalFocusArea && {
      title: 'Critical Focus',
      value: `${insights.data.criticalFocusArea.outletName} · ${insights.data.criticalFocusArea.criticalIssues} issue${insights.data.criticalFocusArea.criticalIssues !== 1 ? 's' : ''}`,
      accent: colors.error,
    },
  ].filter(Boolean) as { title: string; value: string; accent: string }[];

  const negativeSorted = [...(feedback.data?.items ?? [])].sort((a, b) => b.negativeFeedbacks - a.negativeFeedbacks);
  const totalSorted = [...(feedback.data?.items ?? [])].sort((a, b) => b.totalFeedbacks - a.totalFeedbacks);
  const resolvedSorted = [...(feedback.data?.items ?? [])].sort((a, b) => b.resolvedFeedbacks - a.resolvedFeedbacks);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isLoading} onRefresh={refetchAll} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Overview</Text>
          <PeriodSelector value={period} onChange={setPeriod} />
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
        ) : (
          <>
            <CsatHeroCard score={csatScore} totalRatings={totalRatings} />

            {/* Incident stat pills */}
            <View style={styles.statRow}>
              <StatPill label="critical" value={incidents.data?.criticalIssues ?? '--'} color={colors.error} />
              <StatPill label="open" value={incidents.data?.totalOpenIncidents ?? '--'} color={colors.warning} />
              <StatPill label="resolved" value={incidents.data?.incidentsResolvedToday ?? '--'} color={colors.success} />
            </View>

            {/* Quick Insights swipeable cards */}
            {insightItems.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Quick Insights</Text>
                <InsightRow insights={insightItems} />
              </>
            )}

            {/* CSAT Trendline */}
            <Text style={styles.sectionTitle}>CSAT Trendline</Text>
            <View style={styles.chartCard}>
              {trendline.data ? (
                <TrendlineChart
                  current={trendline.data.currentPeriod.values}
                  previous={trendline.data.previousPeriod.values}
                />
              ) : (
                <Text style={styles.empty}>No data</Text>
              )}
            </View>

            {/* Outlet Feedback */}
            <Text style={styles.sectionTitle}>Outlet Feedback</Text>
            <FeedbackCard
              title="Most Negative"
              accent={colors.error}
              items={negativeSorted.map((i) => ({ name: i.outletName, value: i.negativeFeedbacks }))}
            />
            <FeedbackCard
              title="Most Active"
              accent={colors.warning}
              items={totalSorted.map((i) => ({ name: i.outletName, value: i.totalFeedbacks }))}
            />
            <FeedbackCard
              title="Most Resolved"
              accent={colors.success}
              items={resolvedSorted.map((i) => ({ name: i.outletName, value: i.resolvedFeedbacks }))}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 32,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },

  // Period selector
  periodWrap: { position: 'relative', zIndex: 10 },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  periodBtnText: { color: colors.textInverse, fontWeight: typography.semibold, fontSize: typography.sm },
  periodChevron: { color: colors.textInverse, fontSize: 10 },
  periodDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.md,
    minWidth: 120,
  },
  periodOption: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  periodOptionActive: { backgroundColor: colors.primaryTint },
  periodOptionText: { fontSize: typography.sm, color: colors.text, fontWeight: typography.medium },
  periodOptionTextActive: { color: colors.primary, fontWeight: typography.semibold },

  // Hero CSAT card
  heroCard: {
    backgroundColor: colors.primaryTint,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  heroScore: {
    fontSize: 80,
    fontWeight: typography.bold,
    color: colors.success,
    lineHeight: 88,
    letterSpacing: -2,
  },
  heroSuffix: {
    fontSize: 32,
    fontWeight: typography.semibold,
    color: colors.success,
  },
  heroLabel: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  heroSub: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Stat pills
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statPill: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statPillValue: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    lineHeight: 32,
  },
  statPillLabel: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    marginTop: 2,
  },

  // Section title
  sectionTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Insight swipeable
  insightScroll: { gap: spacing.sm, paddingRight: spacing.md, marginBottom: spacing.lg },
  insightCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    width: 200,
  },
  insightTitle: { fontSize: typography.xs, color: colors.textSecondary, marginBottom: 6 },
  insightValue: { fontSize: typography.sm, fontWeight: typography.semibold },

  // Chart
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadow.sm,
  },
  chartLegend: { flexDirection: 'row', gap: spacing.md, alignSelf: 'flex-end', marginBottom: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: typography.xs, color: colors.textSecondary },

  // Feedback
  feedbackCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  feedbackTitle: { fontSize: typography.sm, fontWeight: typography.semibold, marginBottom: spacing.sm },
  feedbackRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  feedbackName: { fontSize: typography.sm, color: colors.text, flex: 1, marginRight: spacing.sm },
  feedbackBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  feedbackBadgeText: { fontSize: typography.xs, fontWeight: typography.semibold },

  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md },
});
