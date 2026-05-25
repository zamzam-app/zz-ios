import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import { OutletFeedbackSection } from './components/OutletFeedbackSection';
import { OverviewTopPanel } from './components/OverviewTopPanel';
import { QuickInsightsRow } from './components/QuickInsightsRow';
import { TrendlineChartCard } from './components/TrendlineChartCard';
import { useOverviewDashboardModel } from './hooks/useOverviewDashboardModel';

export default function OverviewScreen() {
  const {
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
    trendline,
  } = useOverviewDashboardModel();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing && !isLoading}
            onRefresh={refetchAll}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.heading}>Overview</Text>
        </View>

        <OverviewTopPanel
          period={period}
          onPeriodChange={setPeriod}
          topTab={topTab}
          onTabChange={setTopTab}
          mainTitle={mainTitle}
          mainValue={mainValue}
          mainSub={mainSub}
          metrics={topTab === 'reviews' ? reviewMetrics : taskMetrics}
          csatBreakdown={csatBreakdown}
        />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
        ) : (
          <>
            {insightItems.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Quick Insights</Text>
                <QuickInsightsRow insights={insightItems} />
              </>
            )}

            <Text style={styles.sectionTitle}>CSAT Trendline</Text>
            <View style={styles.chartCard}>
              {trendline.data ? (
                <TrendlineChartCard
                  current={trendline.data.currentPeriod.values}
                  previous={trendline.data.previousPeriod.values}
                  labels={trendline.data.currentPeriod.labels}
                />
              ) : (
                <Text style={styles.empty}>No data</Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Outlet Feedback</Text>
            <OutletFeedbackSection openReviewOverview={openReviewOverview} />
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

  sectionTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadow.sm,
  },

  empty: { color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.md },
});
