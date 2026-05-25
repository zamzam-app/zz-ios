import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors, spacing } from '../../../theme/theme';

interface TaskDetailHeaderProps {
  onBack: () => void;
}

export function TaskDetailHeader({ onBack }: TaskDetailHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headingWrap}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.heading} numberOfLines={1}>
            Task Details
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.warmHeaderBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorderDefault,
  },
  headingWrap: { flex: 1 },
  heading: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.textWarmDark,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: -spacing.xs,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
