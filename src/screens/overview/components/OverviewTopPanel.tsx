import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Period } from '../../../api/endpoints/analytics';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';
import type {
  CsatBreakdown,
  OverviewTopTab,
  SummaryMetricItem,
} from '../hooks/useOverviewDashboardModel';

import { CsatFlipCard } from './CsatFlipCard';

const PERIODS: { label: string; value: Period }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'All Time', value: 'all-time' },
];

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
            <Text style={[styles.periodPillText, active && styles.periodPillTextActive]}>
              {periodItem.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function OverviewTopPanel({
  period,
  onPeriodChange,
  topTab,
  onTabChange,
  mainTitle,
  mainValue,
  mainSub,
  metrics,
  csatBreakdown,
}: {
  period: Period;
  onPeriodChange: (period: Period) => void;
  topTab: OverviewTopTab;
  onTabChange: (tab: OverviewTopTab) => void;
  mainTitle: string;
  mainValue: string;
  mainSub?: string;
  metrics: SummaryMetricItem[];
  csatBreakdown: CsatBreakdown;
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
          <Text style={[styles.topTabText, topTab === 'reviews' && styles.topTabTextActive]}>
            Review
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.topTabBtn, topTab === 'tasks' && styles.topTabBtnActive]}
          onPress={() => onTabChange('tasks')}
          activeOpacity={0.82}
        >
          <Text style={[styles.topTabText, topTab === 'tasks' && styles.topTabTextActive]}>
            Task
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.topContentRow}>
        {topTab === 'reviews' ? (
          <CsatFlipCard breakdown={csatBreakdown} />
        ) : (
          <View style={styles.mainStatCard}>
            <Text style={styles.mainStatLabel}>{mainTitle}</Text>
            <Text style={styles.mainStatValue}>{mainValue}</Text>
            {mainSub ? <Text style={styles.mainStatSub}>{mainSub}</Text> : null}
          </View>
        )}

        <View style={styles.metricStackCol}>
          {metrics.map((metric) => {
            const content = (
              <>
                <Text style={[styles.metricStackLabel, { color: `${metric.color}B0` }]}>
                  {metric.label}
                </Text>
                <Text style={[styles.metricStackValue, { color: metric.color }]}>
                  {metric.value}
                </Text>
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

const styles = StyleSheet.create({
  topPanel: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha25,
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
    backgroundColor: colors.uiGray1,
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
    borderColor: colors.warmBorderAlpha36,
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
    borderColor: colors.warmBorderAlpha36,
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
});
