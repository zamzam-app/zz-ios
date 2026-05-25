import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';

interface FilterChipDef {
  key: 'TODAY' | 'UNREAD' | 'HIGH_PRIORITY';
  label: string;
  emoji: string;
  count: number;
  activeBg: string;
  activeText: string;
  inactiveBg: string;
  inactiveText: string;
}

interface TaskFiltersToolbarProps {
  activeFilter: 'ALL' | 'TODAY' | 'UNREAD' | 'HIGH_PRIORITY';
  priorityFilter: string;
  dueDateFilter: Date | null;
  metricFilter: string;
  todayCount: number;
  highPriorityCount: number;
  unreadCount: number;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onFilterPress: () => void;
  onFilterChipPress: (key: 'TODAY' | 'UNREAD' | 'HIGH_PRIORITY') => void;
}

const FILTER_CHIPS: FilterChipDef[] = [
  {
    key: 'TODAY',
    label: 'Today',
    emoji: '🔥',
    count: 0,
    activeBg: '#FFEAD2',
    activeText: '#C2410C',
    inactiveBg: '#F3F4F6',
    inactiveText: '#4B5563',
  },
  {
    key: 'UNREAD',
    label: 'Unread',
    emoji: '🔵',
    count: 0,
    activeBg: '#DBEAFE',
    activeText: '#1D4ED8',
    inactiveBg: '#F3F4F6',
    inactiveText: '#4B5563',
  },
  {
    key: 'HIGH_PRIORITY',
    label: 'High Priority',
    emoji: '🔴',
    count: 0,
    activeBg: '#FEE2E2',
    activeText: '#B91C1C',
    inactiveBg: '#F3F4F6',
    inactiveText: '#4B5563',
  },
];

export function TaskFiltersToolbar({
  activeFilter,
  priorityFilter,
  dueDateFilter,
  metricFilter,
  todayCount,
  highPriorityCount,
  unreadCount,
  searchQuery,
  onSearchChange,
  onFilterPress,
  onFilterChipPress,
}: TaskFiltersToolbarProps) {
  const isFilterActive =
    priorityFilter !== 'ALL' || Boolean(dueDateFilter) || metricFilter !== 'all';

  return (
    <View style={styles.controlsRow}>
      <View style={styles.filterMenuWrapCompact}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          style={[styles.filterIconBtnCompact, isFilterActive && styles.filterIconBtnActive]}
          onPress={onFilterPress}
          activeOpacity={0.82}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={isFilterActive ? colors.primaryDark : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrapCompact}>
        <Ionicons
          name="search"
          size={14}
          color={colors.textSecondary}
          style={styles.searchIconCompact}
        />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          style={styles.searchInputCompact}
          placeholder="Search..."
          placeholderTextColor={colors.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.searchClearBtnCompact}
            onPress={() => onSearchChange('')}
            activeOpacity={0.7}
          >
            <Text style={styles.searchClearTextCompact}>x</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {FILTER_CHIPS.map((f) => {
          const count =
            f.key === 'TODAY'
              ? todayCount
              : f.key === 'HIGH_PRIORITY'
                ? highPriorityCount
                : unreadCount;
          const isActive = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, { backgroundColor: isActive ? f.activeBg : f.inactiveBg }]}
              onPress={() => onFilterChipPress(f.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.filterChipText, { color: isActive ? f.activeText : f.inactiveText }]}
              >
                {f.emoji} {f.label} {count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  controlsRow: {
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  filterMenuWrapCompact: {
    marginRight: spacing.xs,
  },
  filterIconBtnCompact: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIconBtnActive: {
    borderColor: colors.primaryTintStrong,
    backgroundColor: colors.primaryTint,
  },
  searchWrapCompact: {
    width: 110,
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  searchInputCompact: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 30,
    paddingRight: 20,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  searchIconCompact: {
    position: 'absolute',
    left: 10,
    zIndex: 2,
  },
  searchClearBtnCompact: {
    position: 'absolute',
    right: 6,
    width: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray4,
  },
  searchClearTextCompact: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.bold,
    lineHeight: 14,
    includeFontPadding: false,
  },
  filterScrollContent: {
    alignItems: 'center',
    paddingLeft: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginRight: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  filterChipText: {
    fontSize: typography.xs,
    fontWeight: '700',
  },
});
