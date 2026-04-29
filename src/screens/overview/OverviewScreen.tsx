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
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';
import {
  useQuickInsights,
  useGlobalCsat,
  useCsatTrendline,
  useIncidentsOverview,
  useOutletFeedbackSummary,
  useTasksOverview,
} from '../../hooks/useAnalytics';
import { Period } from '../../api/endpoints/analytics';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { AppTabParamList } from '../../navigation/AppNavigator';
import { TaskFilterSource, TaskMetricFilter } from '../../constants/taskFilters';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

type OverviewTopTab = 'reviews' | 'tasks';
type OverviewNav = BottomTabNavigationProp<AppTabParamList, 'Overview'>;

type SummaryMetricItem = {
  key: TaskMetricFilter;
  label: string;
  value: number | string;
  color: string;
  onPress?: () => void;
};

function PeriodPills({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  return (
    <View style={styles.periodPillsRow}>
      {PERIODS.map((periodItem) => {
        const active = periodItem.value === value;
        return (
          <TouchableOpacity
            key={periodItem.value}
            style={[styles.periodPill, active && styles.periodPillActive]}
            onPress={() => onChange(periodItem.value)}
            activeOpacity={0.85}
          >
            <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>{periodItem.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TopSummaryPanel({
  period,
  onPeriodChange,
  topTab,
  onTabChange,
  mainTitle,
  mainValue,
  mainSub,
  metrics,
}: {
  period: Period;
  onPeriodChange: (period: Period) => void;
  topTab: OverviewTopTab;
  onTabChange: (tab: OverviewTopTab) => void;
  mainTitle: string;
  mainValue: string;
  mainSub?: string;
  metrics: SummaryMetricItem[];
}) {
  return (
    <View style={styles.topPanel}>
      <PeriodPills value={period} onChange={onPeriodChange} />

      <View style={styles.topTabRow}>
        <TouchableOpacity
          style={[styles.topTabBtn, topTab === 'reviews' && styles.topTabBtnActive]}
          onPress={() => onTabChange('reviews')}
          activeOpacity={0.82}
        >
          <Text style={[styles.topTabText, topTab === 'reviews' && styles.topTabTextActive]}>Review</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topTabBtn, topTab === 'tasks' && styles.topTabBtnActive]}
          onPress={() => onTabChange('tasks')}
          activeOpacity={0.82}
        >
          <Text style={[styles.topTabText, topTab === 'tasks' && styles.topTabTextActive]}>Task</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topContentRow}>
        <View style={styles.mainStatCard}>
          <Text style={styles.mainStatLabel}>{mainTitle}</Text>
          <Text style={styles.mainStatValue}>{mainValue}</Text>
          {mainSub ? <Text style={styles.mainStatSub}>{mainSub}</Text> : null}
        </View>

        <View style={styles.metricStackCol}>
          {metrics.map((metric) => {
            const content = (
              <>
                <Text style={[styles.metricStackLabel, { color: `${metric.color}B0` }]}>{metric.label}</Text>
                <Text style={[styles.metricStackValue, { color: metric.color }]}>{metric.value}</Text>
              </>
            );

            if (!metric.onPress) {
              return (
                <View
                  key={metric.key}
                  style={[styles.metricStackCard, { backgroundColor: `${metric.color}1A` }]}
                >
                  {content}
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={metric.key}
                style={[styles.metricStackCard, { backgroundColor: `${metric.color}1A` }]}
                activeOpacity={0.84}
                onPress={metric.onPress}
              >
                {content}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

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

export default function OverviewScreen() {
  const navigation = useNavigation<OverviewNav>();
  const [period, setPeriod] = useState<Period>('weekly');
  const [topTab, setTopTab] = useState<OverviewTopTab>('reviews');

  const insights = useQuickInsights(period);
  const csat = useGlobalCsat(period);
  const trendline = useCsatTrendline(period);
  const incidents = useIncidentsOverview(period);
  const feedback = useOutletFeedbackSummary(period);
  const tasksOverview = useTasksOverview();

  const isLoading = insights.isLoading || csat.isLoading;
  const isRefreshing = insights.isFetching
    || csat.isFetching
    || trendline.isFetching
    || incidents.isFetching
    || feedback.isFetching
    || tasksOverview.isFetching;

  const refetchAll = () => {
    void insights.refetch();
    void csat.refetch();
    void trendline.refetch();
    void incidents.refetch();
    void feedback.refetch();
    void tasksOverview.refetch();
  };

  const csatScore = csat.data?.globalCsatScore;
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

  const taskOpenCount = tasksOverview.data?.totalOpenTasks;
  const taskCriticalCount = tasksOverview.data?.criticalOpenTasks;
  const taskCompletedCount = tasksOverview.data?.completedTasks;
  const dueTodayCount = tasksOverview.data?.dueTodayTasks;

  const navigateToTasksWithFilter = (metric: TaskMetricFilter, source: TaskFilterSource) => {
    navigation.navigate('Tasks', {
      screen: 'TasksList',
      params: {
        initialTaskFilter: {
          metric,
          source,
          nonce: Date.now(),
        },
      },
    });
  };

  const reviewMetrics: SummaryMetricItem[] = [
    {
      key: 'open',
      label: 'Open',
      value: incidents.data?.totalOpenIncidents ?? '--',
      color: colors.warning,
    },
    {
      key: 'resolved',
      label: 'Resolved',
      value: incidents.data?.incidentsResolvedToday ?? '--',
      color: colors.success,
    },
  ];

  const taskMetrics: SummaryMetricItem[] = [
    {
      key: 'open',
      label: 'Open',
      value: taskOpenCount ?? '--',
      color: colors.warning,
      onPress: () => navigateToTasksWithFilter('open', 'overview_tasks_metric'),
    },
    {
      key: 'resolved',
      label: 'Completed',
      value: taskCompletedCount ?? '--',
      color: colors.success,
      onPress: () => navigateToTasksWithFilter('resolved', 'overview_tasks_metric'),
    },
  ];

  const mainTitle = topTab === 'reviews' ? 'Overall CSAT Score' : 'Due today';
  const mainValue = topTab === 'reviews'
    ? (typeof csatScore === 'number' ? `${csatScore.toFixed(1)}/5` : '--')
    : (typeof dueTodayCount === 'number' ? String(dueTodayCount) : '--');
  const mainSub = topTab === 'reviews'
    ? `${totalRatings} ratings this period`
    : `${taskCriticalCount ?? '--'} critical tasks`; // critical hidden in metric stack for Tasks tab

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefreshing && !isLoading} onRefresh={refetchAll} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Overview</Text>
        </View>

        <TopSummaryPanel
          period={period}
          onPeriodChange={setPeriod}
          topTab={topTab}
          onTabChange={setTopTab}
          mainTitle={mainTitle}
          mainValue={mainValue}
          mainSub={mainSub}
          metrics={topTab === 'reviews' ? reviewMetrics : taskMetrics}
        />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
        ) : (
          <>
            {insightItems.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Quick Insights</Text>
                <InsightRow insights={insightItems} />
              </>
            )}

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: 120 },

  header: {
    marginBottom: spacing.md,
  },
  heading: {
    fontSize: 32,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },

  topPanel: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#D3C5AC40',
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  periodPillsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
  },
  periodPill: {
    minWidth: 70,
    height: 30,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  periodPillActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintStrong,
  },
  periodPillText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  periodPillTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },

  topTabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  topTabBtn: {
    minWidth: 72,
    height: 30,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F6',
  },
  topTabBtnActive: {
    backgroundColor: colors.primaryTint,
  },
  topTabText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  topTabTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },

  topContentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  mainStatCard: {
    flex: 1,
    minHeight: 152,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#D3C5AC5C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mainStatLabel: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.medium,
    textAlign: 'center',
  },
  mainStatValue: {
    marginTop: spacing.sm,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -1,
  },
  mainStatSub: {
    marginTop: 6,
    fontSize: typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  metricStackCol: {
    width: 110,
    gap: spacing.xs,
    justifyContent: 'flex-start',
  },
  metricStackCard: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D3C5AC5C',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricStackLabel: {
    fontSize: typography.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontWeight: typography.medium,
    textAlign: 'center',
  },
  metricStackValue: {
    marginTop: 2,
    fontSize: typography.lg,
    fontWeight: typography.bold,
    lineHeight: 24,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  insightScroll: { gap: spacing.sm, paddingRight: spacing.md, marginBottom: spacing.lg },
  insightCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    width: 200,
  },
  insightTitle: { fontSize: typography.xs, color: colors.textSecondary, marginBottom: 6 },
  insightValue: { fontSize: typography.sm, fontWeight: typography.semibold },

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
