import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

import { Period } from '../../../api/endpoints/analytics';
import { ReviewMetricFilter, ReviewTypeFilter } from '../../../constants/reviewFilters';
import { TaskFilterSource, TaskMetricFilter } from '../../../constants/taskFilters';
import {
  useQuickInsights,
  useGlobalCsat,
  useCsatTrendline,
  useIncidentsOverview,
  useOutletFeedbackSummary,
  useTasksOverview,
} from '../../../hooks/analytics';
import { AppTabParamList } from '../../../navigation/AppNavigator';
import { colors } from '../../../theme/theme';
import { buildOpenReviewOverviewModel } from '../reviewOverview';

export type OverviewTopTab = 'reviews' | 'tasks';

export interface SummaryMetricItem {
  key: TaskMetricFilter;
  label: string;
  value: number | string;
  color: string;
  onPress?: () => void;
}

export interface CsatBreakdownItem {
  questionId: string;
  title: string;
  score: number;
  totalRatings: number;
}

export interface CsatBreakdown {
  score: string;
  ratings: string;
  items: CsatBreakdownItem[];
}

type OverviewNav = BottomTabNavigationProp<AppTabParamList, 'Overview'>;

export function useOverviewDashboardModel() {
  const navigation = useNavigation<OverviewNav>();
  const [period, setPeriod] = useState<Period>('weekly');
  const [topTab, setTopTab] = useState<OverviewTopTab>('reviews');

  const insights = useQuickInsights(period);
  const csat = useGlobalCsat(period);
  const trendline = useCsatTrendline(period);
  const incidents = useIncidentsOverview(period);
  const feedback = useOutletFeedbackSummary(period);
  const tasksOverview = useTasksOverview(period);

  const isLoading = insights.isLoading || csat.isLoading;
  const isRefreshing =
    insights.isFetching ||
    csat.isFetching ||
    trendline.isFetching ||
    incidents.isFetching ||
    feedback.isFetching ||
    tasksOverview.isFetching;

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
  const seenTitles = new Set<string>();
  const csatBreakdownItems: CsatBreakdownItem[] = (csat.data?.breakdown ?? [])
    .filter((i) => {
      if (typeof i?.score !== 'number') return false;
      if (seenTitles.has(i.title)) return false;
      seenTitles.add(i.title);
      return true;
    })
    .map((i) => ({
      questionId: i.questionId,
      title: i.title,
      score: i.score,
      totalRatings: i.totalRatings,
    }));

  const csatBreakdown: CsatBreakdown = {
    score: typeof csatScore === 'number' ? String(csatScore.toFixed(1)) + '/5' : '--',
    ratings: String(totalRatings),
    items: csatBreakdownItems,
  };

  const quickInsightsCriticalFocus = insights.data?.criticalFocusArea;

  const insightItems = [
    quickInsightsCriticalFocus &&
      quickInsightsCriticalFocus.outletId &&
      quickInsightsCriticalFocus.criticalIssues > 0 && {
        title: 'Critical Focus',
        value: `${quickInsightsCriticalFocus.outletName} · ${quickInsightsCriticalFocus.criticalIssues} issue${quickInsightsCriticalFocus.criticalIssues !== 1 ? 's' : ''}`,
        accent: colors.error,
        onPress: () =>
          navigateToReviewsWithFilter(
            undefined,
            'critical',
            'overview_reviews_metric',
            quickInsightsCriticalFocus.outletId ?? undefined,
          ),
      },
    insights.data?.mostImprovedOutlet && {
      title: 'Most Improved',
      value: `${insights.data.mostImprovedOutlet.outletName} (${insights.data.mostImprovedOutlet.improvement >= 0 ? '+' : ''}${insights.data.mostImprovedOutlet.improvement.toFixed(1)})`,
      accent: colors.success,
    },
    insights.data?.peakIncidentTime && {
      title: 'Peak Incident Time',
      value: insights.data.peakIncidentTime.label,
      accent: colors.warning,
    },
  ].filter(Boolean) as { title: string; value: string; accent: string; onPress?: () => void }[];

  const openReviewOverview = buildOpenReviewOverviewModel(feedback.data?.items);

  const taskOpenCount = tasksOverview.data?.totalOpenTasks;
  const taskCriticalCount = tasksOverview.data?.criticalOpenTasks;
  const taskCompletedCount = tasksOverview.data?.completedTasks;
  const dueTodayCount = tasksOverview.data?.dueTodayTasks;
  const dueInPeriodCount = tasksOverview.data?.dueInPeriodTasks;

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

  const navigateToReviewsWithFilter = (
    metric: ReviewMetricFilter | undefined,
    typeFilter: ReviewTypeFilter | undefined,
    source: TaskFilterSource,
    outletId?: string,
  ) => {
    navigation.navigate('Reviews', {
      screen: 'ReviewsList',
      params: {
        initialReviewFilter: {
          ...(metric ? { metric } : {}),
          ...(typeFilter ? { typeFilter } : {}),
          ...(outletId ? { outletId } : {}),
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
      onPress: () => navigateToReviewsWithFilter('open', undefined, 'overview_reviews_metric'),
    },
    {
      key: 'resolved',
      label: 'Critical',
      value: incidents.data?.criticalIssues ?? '--',
      color: colors.error,
      onPress: () => navigateToReviewsWithFilter(undefined, 'critical', 'overview_reviews_metric'),
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

  const taskDueTitle =
    period === 'daily'
      ? 'Due today'
      : period === 'weekly'
        ? 'Due this week'
        : period === 'monthly'
          ? 'Due this month'
          : 'Due all time';

  const mainTitle = topTab === 'reviews' ? 'Overall CSAT Score' : taskDueTitle;

  const mainValue =
    topTab === 'reviews'
      ? typeof csatScore === 'number'
        ? `${csatScore.toFixed(1)}/5`
        : '--'
      : typeof dueInPeriodCount === 'number'
        ? String(dueInPeriodCount)
        : typeof dueTodayCount === 'number'
          ? String(dueTodayCount)
          : '--';

  const mainSub =
    topTab === 'reviews'
      ? `${totalRatings} ratings this period`
      : `${taskCriticalCount ?? '--'} critical tasks`;

  return {
    period,
    setPeriod,
    topTab,
    setTopTab,
    isLoading,
    isRefreshing,
    refetchAll,
    csatBreakdown,
    insightItems,
    openReviewOverview,
    reviewMetrics,
    taskMetrics,
    mainTitle,
    mainValue,
    mainSub,
    insights,
    csat,
    trendline,
    incidents,
    feedback,
    tasksOverview,
  };
}
