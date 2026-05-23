import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';
import type { CsatBreakdown } from '../hooks/useOverviewDashboardModel';

export function CsatFlipCard({ breakdown }: { breakdown: CsatBreakdown }) {
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useMemo(() => new Animated.Value(0), []);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearInactivityTimeout = () => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };

  const animateTo = (toValue: 0 | 1) => {
    Animated.timing(flipAnim, {
      toValue,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const scheduleAutoFlipBack = () => {
    clearInactivityTimeout();
    inactivityTimeoutRef.current = setTimeout(() => {
      setFlipped(false);
      animateTo(0);
    }, 60_000);
  };

  const onPress = () => {
    if (flipped) {
      clearInactivityTimeout();
      setFlipped(false);
      animateTo(0);
      return;
    }

    setFlipped(true);
    animateTo(1);
    scheduleAutoFlipBack();
  };

  useEffect(() => {
    return () => {
      clearInactivityTimeout();
    };
  }, []);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  return (
    <TouchableOpacity style={styles.mainStatCard} activeOpacity={0.9} onPress={onPress}>
      <View style={styles.flipCardInner}>
        <Animated.View
          style={[
            styles.flipFace,
            { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] },
          ]}
        >
          <Text style={styles.mainStatLabel}>Overall CSAT Score</Text>
          <Text style={styles.mainStatValue}>{breakdown.score}</Text>
          <Text style={styles.mainStatSub}>{breakdown.ratings} ratings this period</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.flipFace,
            styles.flipFaceBack,
            { transform: [{ perspective: 1000 }, { rotateY: backRotate }] },
          ]}
        >
          <Text style={styles.flipBackTitle}>CSAT Breakdown</Text>
          {breakdown.items.length ? (
            <ScrollView
              style={{ width: '100%' }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {breakdown.items.map((item) => (
                <View key={item.questionId} style={styles.flipRow}>
                  <Text style={styles.flipKey} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.flipValue}>{item.score.toFixed(1)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.flipEmpty}>No breakdown available</Text>
          )}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
  flipCardInner: {
    width: '100%',
    minHeight: 132,
    justifyContent: 'center',
  },
  flipFace: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  flipFaceBack: {
    paddingHorizontal: spacing.sm,
  },
  flipBackTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  flipRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  flipKey: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  flipValue: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  flipEmpty: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
