import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors } from '../theme/theme';

interface UnreadBadgeProps {
  count: number;
  size?: 'sm' | 'md';
  /** If true, renders a plain dot without count text (for very small spaces). */
  dotOnly?: boolean;
}

function UnreadBadge({ count, size = 'sm', dotOnly = false }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const badgeSize = size === 'md' ? 20 : 16;
  const fontSize = size === 'md' ? 10 : 9;

  if (dotOnly) {
    return <View style={[styles.dot, { width: 8, height: 8, borderRadius: 4 }]} />;
  }

  const displayCount = count > 99 ? '99+' : String(count);

  return (
    <View
      style={[
        styles.badge,
        { minWidth: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize }]}>{displayCount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: colors.textInverse,
    fontWeight: '700',
    includeFontPadding: false,
    textAlign: 'center',
  },
  dot: {
    backgroundColor: colors.error,
  },
});

export default React.memo(UnreadBadge);
