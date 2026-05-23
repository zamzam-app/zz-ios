import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { MetricsHeatmapItem } from '../../../api/endpoints/analytics';
import { colors, spacing, radius, typography } from '../../../theme/theme';
import {
  METRIC_ORDER,
  METRIC_LABELS,
  scoreToPercent,
  getMetricTone,
} from '../hooks/useReviewsFilterState';

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

export function HeatmapSection({
  heatmapRowsWithFallback,
  selectedOutletId,
  onOutletSelect,
  selectedOutletLabel,
  isLoading,
}: {
  heatmapRowsWithFallback: MetricsHeatmapItem[];
  selectedOutletId: string;
  onOutletSelect: () => void;
  selectedOutletLabel: string;
  isLoading: boolean;
}) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.outletSelectWrap}>
        <TouchableOpacity
          style={styles.outletSelectBtn}
          onPress={onOutletSelect}
          activeOpacity={0.8}
        >
          <Text style={styles.outletSelectBtnText} numberOfLines={1}>
            {selectedOutletLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

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

      {isLoading ? (
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
  );
}

const styles = StyleSheet.create({
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
  outletSelectWrap: {
    marginHorizontal: 0,
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
