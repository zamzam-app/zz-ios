import React, { useEffect, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, spacing, radius } from '../theme/theme';

// ─── Skeleton Config ────────────────────────────────────────────────────────

const SKELETON_DURATION = 900;
const CARD_EVENTS = 3;
const EVENT_SKELETON_KEYS = Array.from(
  { length: CARD_EVENTS },
  (_unused, index) => `skel_${index}`,
);

const pulse = (value: Animated.Value) =>
  Animated.loop(
    Animated.sequence([
      Animated.timing(value, {
        toValue: 0.3,
        duration: SKELETON_DURATION / 2,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: SKELETON_DURATION / 2,
        useNativeDriver: true,
      }),
    ]),
  );

// ─── Skeleton Block ─────────────────────────────────────────────────────────

function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const anim = pulse(opacity);
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, style, { opacity }]} />;
}

// ─── Summary Card Skeleton ──────────────────────────────────────────────────

function SummaryCardSkeleton() {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryTopRow}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock style={styles.titleBlock} />
          <SkeletonBlock style={styles.subtitleBlock} />
        </View>
        <SkeletonBlock style={styles.badgeBlock} />
      </View>

      <SkeletonBlock style={styles.rowBlock} />
      <SkeletonBlock style={styles.rowBlockShort} />
      <SkeletonBlock style={styles.rowBlock} />

      <SkeletonBlock style={styles.descLabelBlock} />
      <SkeletonBlock style={styles.descBlock} />
      <SkeletonBlock style={styles.descBlockShort} />

      <View style={styles.statsRow}>
        <SkeletonBlock style={styles.statChip} />
        <SkeletonBlock style={styles.statChip} />
        <SkeletonBlock style={styles.statChipSmall} />
      </View>
    </View>
  );
}

// ─── Event Card Skeleton ────────────────────────────────────────────────────

function EventCardSkeleton() {
  return (
    <View style={styles.eventCard}>
      <View style={styles.railColumn}>
        <SkeletonBlock style={styles.railDot} />
      </View>
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <SkeletonBlock style={styles.actorBlock} />
          <SkeletonBlock style={styles.timeBlock} />
        </View>
        <SkeletonBlock style={styles.eventBodyBlock} />
        <SkeletonBlock style={styles.eventBodyBlockShort} />
      </View>
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <View style={styles.container}>
      <SummaryCardSkeleton />
      {EVENT_SKELETON_KEYS.map((key) => (
        <EventCardSkeleton key={key} />
      ))}
    </View>
  );
}

export default React.memo(TimelineSkeleton);

// ─── Styles ─────────────────────────────────────────────────────────────────

const BASE = { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm };
const BLOCK_HEIGHT = 14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  block: {
    ...BASE,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha25,
    gap: spacing.sm,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleBlock: {
    width: '60%',
    height: BLOCK_HEIGHT + 4,
    borderRadius: radius.sm,
  },
  subtitleBlock: {
    width: '40%',
    height: BLOCK_HEIGHT - 2,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  badgeBlock: {
    width: 60,
    height: 28,
    borderRadius: radius.full,
  },
  rowBlock: {
    height: BLOCK_HEIGHT,
    borderRadius: radius.sm,
  },
  rowBlockShort: {
    width: '70%',
    height: BLOCK_HEIGHT,
    borderRadius: radius.sm,
  },
  descLabelBlock: {
    width: '30%',
    height: BLOCK_HEIGHT - 2,
    borderRadius: radius.sm,
  },
  descBlock: {
    height: BLOCK_HEIGHT * 2,
    borderRadius: radius.sm,
  },
  descBlockShort: {
    width: '50%',
    height: BLOCK_HEIGHT,
    borderRadius: radius.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statChip: {
    width: 90,
    height: 24,
    borderRadius: radius.sm,
  },
  statChipSmall: {
    width: 140,
    height: 24,
    borderRadius: radius.sm,
  },

  // Event Card
  eventCard: {
    flexDirection: 'row',
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  railColumn: {
    width: 32,
    alignItems: 'center',
    paddingTop: 4,
  },
  railDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  eventContent: {
    flex: 1,
    paddingLeft: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actorBlock: {
    width: '40%',
    height: BLOCK_HEIGHT,
    borderRadius: radius.sm,
  },
  timeBlock: {
    width: '20%',
    height: BLOCK_HEIGHT - 2,
    borderRadius: radius.sm,
  },
  eventBodyBlock: {
    height: BLOCK_HEIGHT,
    borderRadius: radius.sm,
  },
  eventBodyBlockShort: {
    width: '60%',
    height: BLOCK_HEIGHT,
    borderRadius: radius.sm,
  },
});
