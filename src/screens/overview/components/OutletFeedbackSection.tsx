import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme/theme';
import type { OpenReviewOverviewModel } from '../reviewOverview';

const FEEDBACK_VISIBLE_ROWS = 4;
const FEEDBACK_ROW_HEIGHT = 46;
const FEEDBACK_HEADER_HEIGHT = 54;

function FeedbackCard({
  title,
  subtext,
  accent,
  items,
}: {
  title: string;
  subtext: string;
  accent: string;
  items: { name: string; value: number }[];
}) {
  const headerBg =
    accent === colors.warning ? '#E6D7BC' : accent === colors.success ? '#C9DCCB' : '#F3DFDC';

  return (
    <View style={[styles.feedbackCard, { backgroundColor: accent + '18' }]}>
      <ScrollView
        style={[
          styles.feedbackList,
          { maxHeight: FEEDBACK_HEADER_HEIGHT + FEEDBACK_ROW_HEIGHT * FEEDBACK_VISIBLE_ROWS },
        ]}
        nestedScrollEnabled
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.feedbackStickyHeader, { backgroundColor: headerBg }]}>
          <Text style={[styles.feedbackTitle, { color: accent }]}>{title}</Text>
          <Text style={styles.feedbackSubtext}>{subtext}</Text>
        </View>
        {items.map((item) => (
          <View key={`${item.name}-${item.value}`} style={styles.feedbackRow}>
            <Text style={styles.feedbackName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.feedbackBadge, { backgroundColor: accent + '18' }]}>
              <Text style={[styles.feedbackBadgeText, { color: accent }]}>{item.value}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function OutletFeedbackSection({
  openReviewOverview,
}: {
  openReviewOverview: OpenReviewOverviewModel;
}) {
  return (
    <>
      <FeedbackCard
        title="Open Critical"
        subtext="Unresolved critical reviews"
        accent={colors.error}
        items={openReviewOverview.criticalItems}
      />
      <FeedbackCard
        title="Open Reviews"
        subtext="Unresolved reviews in this period"
        accent={colors.warning}
        items={openReviewOverview.openItems}
      />
      <FeedbackCard
        title="Resolved Reviews"
        subtext="Resolved feedback in this period"
        accent={colors.success}
        items={openReviewOverview.resolvedItems}
      />
    </>
  );
}

const styles = StyleSheet.create({
  feedbackCard: {
    borderRadius: radius.lg,
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  feedbackList: {
    width: '100%',
  },
  feedbackStickyHeader: {
    minHeight: FEEDBACK_HEADER_HEIGHT,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    zIndex: 3,
    elevation: 3,
  },
  feedbackTitle: { fontSize: typography.sm, fontWeight: typography.semibold },
  feedbackSubtext: { fontSize: 10, marginTop: 2, color: colors.text, opacity: 0.8 },
  feedbackRow: {
    minHeight: FEEDBACK_ROW_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
  },
  feedbackName: { fontSize: typography.sm, color: colors.text, flex: 1, marginRight: spacing.sm },
  feedbackBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  feedbackBadgeText: { fontSize: typography.xs, fontWeight: typography.semibold },
});
