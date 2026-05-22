import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

export interface FilterOption<T> {
  label: string;
  value: T;
}

interface Props<T> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  maxVisible?: number;
}

export function FilterDropdown<T>({ options, value, onChange, maxVisible = 6 }: Props<T>) {
  const [open, setOpen] = useState(false);
  const active = options.find((o) => o.value === value) ?? options[0];
  // only constrain height when there are more items than maxVisible (to enable scrolling)
  const BOTTOM_PAD = 16;
  const needsScroll = options.length > maxVisible;
  const maxHeight = needsScroll ? 46 * maxVisible + BOTTOM_PAD : undefined;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.pill} onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
        <Text style={styles.pillText} numberOfLines={1}>
          {active.label}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color="#fff" />
      </TouchableOpacity>

      {open && (
        <View style={[styles.dropdown, maxHeight ? { maxHeight } : null]}>
          <ScrollView
            scrollEnabled={needsScroll}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ paddingBottom: BOTTOM_PAD }}
          >
            {options.map((opt, i) => {
              const isActive = opt.value === value;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[
                    styles.option,
                    i < options.length - 1 && styles.optionDivider,
                    i === options.length - 1 && styles.optionLast,
                    isActive && styles.optionActive,
                  ]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.65}
                >
                  <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={15} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 20 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  pillText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: '#fff',
    flexShrink: 1,
  },

  dropdown: {
    position: 'absolute',
    top: 44,
    left: 0,
    minWidth: 168,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadow.md,
    zIndex: 999,
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    minHeight: 46,
  },
  optionLast: { paddingBottom: 20 },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionActive: { backgroundColor: colors.primaryTint },
  optionText: { fontSize: typography.sm, color: colors.text, fontWeight: typography.medium },
  optionTextActive: { color: colors.primary, fontWeight: typography.semibold },
});
