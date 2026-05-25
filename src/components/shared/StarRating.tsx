import React from 'react';
import {
  AccessibilityActionEvent,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors } from '../../theme/theme';

type StarRatingMode = 'display' | 'interactive';

interface StarRatingProps {
  rating: number;
  size?: number;
  maxStars?: number;
  mode?: StarRatingMode;
  onChange?: (nextRating: number) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function StarRating({
  rating,
  size = 16,
  maxStars = 5,
  mode = 'display',
  onChange,
  style,
  accessibilityLabel,
}: StarRatingProps) {
  const clampedRating = clamp(rating, 0, maxStars);
  const roundedRating = clamp(Math.round(clampedRating), 0, maxStars);

  const defaultLabel = `${clampedRating.toFixed(1)} out of ${maxStars} stars`;

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (mode !== 'interactive' || !onChange) return;

    if (event.nativeEvent.actionName === 'increment') {
      onChange(clamp(roundedRating + 1, 1, maxStars));
      return;
    }

    if (event.nativeEvent.actionName === 'decrement') {
      onChange(clamp(roundedRating - 1, 1, maxStars));
    }
  };

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={accessibilityLabel ?? defaultLabel}
      accessibilityRole={mode === 'interactive' ? 'adjustable' : undefined}
      accessibilityValue={
        mode === 'interactive' ? { min: 1, max: maxStars, now: roundedRating } : undefined
      }
      accessibilityActions={
        mode === 'interactive' ? [{ name: 'increment' }, { name: 'decrement' }] : undefined
      }
      onAccessibilityAction={mode === 'interactive' ? handleAccessibilityAction : undefined}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        const isFilled = index + 1 <= roundedRating;
        return (
          <Text
            key={index + 1}
            style={{ fontSize: size, color: isFilled ? colors.accentGold : colors.border }}
            accessible={false}
          >
            ★
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
});
