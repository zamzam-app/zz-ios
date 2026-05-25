import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Text as SvgText, Circle } from 'react-native-svg';

import { colors, radius, spacing, typography } from '../../../theme/theme';

export function TrendlineChartCard({
  current,
  previous,
  labels,
}: {
  current: number[];
  previous: number[];
  labels: string[];
}) {
  const W = 300;
  const H = 130;
  const PAD = { top: 12, bottom: 26, left: 24, right: 8 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const toPoints = (values: number[]) => {
    if (values.length < 2) return '';
    return values
      .map((v, i) => {
        const x = PAD.left + (i / (values.length - 1)) * chartW;
        const y = PAD.top + chartH - (v / 5) * chartH;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const lastCurrent = current.length > 0 ? current[current.length - 1] : null;
  const lastX = lastCurrent !== null ? PAD.left + chartW : 0;
  const lastY = lastCurrent !== null ? PAD.top + chartH - (lastCurrent / 5) * chartH : 0;
  const xLabelIndices =
    labels.length > 1
      ? Array.from(new Set([0, Math.floor((labels.length - 1) / 2), labels.length - 1]))
      : [0];

  return (
    <View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendLine, styles.legendLineDashed, { borderColor: colors.border }]}
          />
          <Text style={styles.legendText}>Previous</Text>
        </View>
      </View>
      <Svg width={W} height={H}>
        {[0, 1, 2, 3, 4, 5].map((y) => {
          const cy = PAD.top + chartH - (y / 5) * chartH;
          return (
            <React.Fragment key={y}>
              <Line
                x1={PAD.left}
                y1={cy}
                x2={W - PAD.right}
                y2={cy}
                stroke={colors.border}
                strokeWidth={0.5}
              />
              <SvgText
                x={PAD.left - 4}
                y={cy + 4}
                fontSize={9}
                fill={colors.textSecondary}
                textAnchor="end"
              >
                {y}
              </SvgText>
            </React.Fragment>
          );
        })}
        {previous.length > 1 && (
          <Polyline
            points={toPoints(previous)}
            fill="none"
            stroke={colors.border}
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />
        )}
        {current.length > 1 && (
          <Polyline
            points={toPoints(current)}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
          />
        )}
        {lastCurrent !== null && current.length > 1 && (
          <Circle cx={lastX} cy={lastY} r={4} fill={colors.primary} />
        )}
        {xLabelIndices.map((index) => {
          const denominator = Math.max(1, labels.length - 1);
          const x = PAD.left + (index / denominator) * chartW;
          return (
            <SvgText
              key={`x-label-${index}`}
              x={x}
              y={H - 4}
              fontSize={9}
              fill={colors.textSecondary}
              textAnchor={index === 0 ? 'start' : index === labels.length - 1 ? 'end' : 'middle'}
            >
              {labels[index] ?? ''}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartLegend: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'flex-end',
    marginBottom: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 18, height: 2, borderRadius: radius.full },
  legendLineDashed: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  legendText: { fontSize: typography.xs, color: colors.textSecondary },
});
