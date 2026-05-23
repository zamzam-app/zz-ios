import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { FranchiseRankingItem } from '../../../api/endpoints/analytics';
import StarRating from '../../../components/shared/StarRating';
import { colors, spacing, radius, typography } from '../../../theme/theme';

function RankingItemRow({ item }: { item: FranchiseRankingItem }) {
  return (
    <View style={styles.rankRow}>
      <View style={styles.rankLeftWrap}>
        <Text style={styles.rankIndex}>{String(item.rank).padStart(2, '0')}</Text>
        <View>
          <Text style={styles.rankOutletName}>{item.outletName}</Text>
          <Text style={styles.rankManager} numberOfLines={1}>
            {item.managerNames && item.managerNames.length > 0
              ? `Mgr: ${item.managerNames[0]}`
              : 'Manager unavailable'}
          </Text>
        </View>
      </View>

      <View style={styles.rankScoreWrap}>
        <StarRating rating={item.csatScore} size={12} />
        <Text style={styles.rankScoreText}>{item.csatScore.toFixed(1)} / 5.0</Text>
      </View>
    </View>
  );
}

export function ReviewsAnalyticsSection({
  ranking,
  isLoading,
}: {
  ranking: FranchiseRankingItem[];
  isLoading: boolean;
}) {
  const topRanking = ranking.slice(0, 3);

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionEyebrow}>Franchise Ranking</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : topRanking.length === 0 ? (
        <Text style={styles.emptyText}>No franchise ranking available.</Text>
      ) : (
        <View style={styles.rankList}>
          {topRanking.map((item) => (
            <RankingItemRow key={item.outletId} item={item} />
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
  rankList: {
    gap: spacing.sm,
  },
  rankRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rankIndex: {
    width: 28,
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.warmBorder,
    fontStyle: 'italic',
  },
  rankOutletName: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.text,
  },
  rankManager: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rankScoreWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rankScoreText: {
    fontSize: 10,
    color: colors.accentBrownText,
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
