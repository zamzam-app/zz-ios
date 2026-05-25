import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';

const WEEK_DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

interface TaskRecurrenceSectionProps {
  isRecurring: boolean;
  hideRecurringToggle?: boolean;
  recurrenceType: 'WEEKLY' | 'MONTHLY';
  recurrenceDays: number[];
  onRecurringChange: (value: boolean) => void;
  onTypeChange: (type: 'WEEKLY' | 'MONTHLY') => void;
  onDaysChange: (days: number[]) => void;
  onShowMonthDaysPicker: () => void;
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          style={[styles.chip, value === o && styles.chipActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>
            {o.replace(/_/g, ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function TaskRecurrenceSection({
  isRecurring,
  hideRecurringToggle,
  recurrenceType,
  recurrenceDays,
  onRecurringChange,
  onTypeChange,
  onDaysChange,
  onShowMonthDaysPicker,
}: TaskRecurrenceSectionProps) {
  return (
    <>
      {!hideRecurringToggle && (
        <View style={styles.recurrenceRow}>
          <Text style={[styles.label, { marginTop: 0 }]}>Recurring Task</Text>
          <Switch
            value={isRecurring}
            onValueChange={onRecurringChange}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={isRecurring ? colors.primary : '#f4f3f4'}
          />
        </View>
      )}

      {isRecurring && (
        <View style={styles.recurrenceContainer}>
          <Text style={styles.label}>Recurrence Type</Text>
          <ChipGroup
            options={['WEEKLY', 'MONTHLY']}
            value={recurrenceType}
            onChange={(val: 'WEEKLY' | 'MONTHLY') => {
              onTypeChange(val);
              onDaysChange([]);
            }}
          />

          <Text style={styles.label}>
            {recurrenceType === 'WEEKLY' ? 'Days of Week' : 'Days of Month'} *
          </Text>
          {recurrenceType === 'WEEKLY' ? (
            <View style={styles.chipRow}>
              {WEEK_DAYS.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.chip, recurrenceDays.includes(o.value) && styles.chipActive]}
                  onPress={() => {
                    onDaysChange(
                      recurrenceDays.includes(o.value)
                        ? recurrenceDays.filter((v) => v !== o.value)
                        : [...recurrenceDays, o.value].sort((a, b) => a - b),
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      recurrenceDays.includes(o.value) && styles.chipTextActive,
                    ]}
                  >
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity style={styles.input} onPress={onShowMonthDaysPicker}>
              <Text
                style={{
                  color: recurrenceDays.length > 0 ? colors.text : colors.textDisabled,
                }}
              >
                {recurrenceDays.length > 0
                  ? recurrenceDays.sort((a, b) => a - b).join(', ')
                  : 'Select days...'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
    marginBottom: 2,
    marginTop: spacing.sm,
  },
  recurrenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  recurrenceContainer: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse, fontWeight: typography.medium },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
});
