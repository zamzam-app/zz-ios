import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/theme';

export function QuickInsightsRow({
  insights,
}: {
  insights: { title: string; value: string; accent: string; onPress?: () => void }[];
}) {
  if (!insights.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.insightScroll}
    >
      {insights.map((item) => {
        const Content = (
          <>
            <Text style={styles.insightTitle}>{item.title}</Text>
            <Text style={[styles.insightValue, { color: item.accent }]}>{item.value}</Text>
          </>
        );
        return item.onPress ? (
          <TouchableOpacity
            key={item.title}
            style={[styles.insightCard, { backgroundColor: item.accent + '18' }]}
            onPress={item.onPress}
            activeOpacity={0.8}
          >
            {Content}
          </TouchableOpacity>
        ) : (
          <View
            key={item.title}
            style={[styles.insightCard, { backgroundColor: item.accent + '18' }]}
          >
            {Content}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  insightScroll: { gap: spacing.sm, paddingRight: spacing.md, marginBottom: spacing.lg },
  insightCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    width: 200,
  },
  insightTitle: { fontSize: typography.xs, color: colors.textSecondary, marginBottom: 6 },
  insightValue: { fontSize: typography.sm, fontWeight: typography.semibold },
});
