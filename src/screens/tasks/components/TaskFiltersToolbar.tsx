import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

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

const SEARCH_COLLAPSED_WIDTH = 40;
const SEARCH_ANIMATION_MS = 240;

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
  const inputRef = useRef<TextInput>(null);
  const [searchProgress] = useState(() => new Animated.Value(searchQuery ? 1 : 0));
  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(searchQuery));
  const [rowWidth, setRowWidth] = useState(0);

  const expandedSearchWidth = rowWidth
    ? Math.max(
        SEARCH_COLLAPSED_WIDTH,
        rowWidth - spacing.md * 2 - SEARCH_COLLAPSED_WIDTH - spacing.xs - spacing.sm,
      )
    : 280;

  const searchWidth = searchProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SEARCH_COLLAPSED_WIDTH, expandedSearchWidth],
  });

  const filterChipsOpacity = searchProgress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [1, 0.35, 0],
  });

  const searchFieldOpacity = searchProgress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 0, 1],
  });

  const animateSearch = (toValue: 0 | 1, onComplete?: () => void) => {
    Animated.timing(searchProgress, {
      toValue,
      duration: SEARCH_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  };

  const expandSearch = () => {
    if (!isSearchExpanded) {
      setIsSearchExpanded(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      animateSearch(1);
      return;
    }
    inputRef.current?.focus();
  };

  const collapseSearch = () => {
    if (searchQuery.trim()) return;
    animateSearch(0, () => setIsSearchExpanded(false));
  };

  const handleControlsLayout = (event: LayoutChangeEvent) => {
    setRowWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.controlsRow} onLayout={handleControlsLayout}>
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

      <Animated.View style={[styles.searchWrapCompact, { width: searchWidth }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isSearchExpanded ? 'Focus task search' : 'Search tasks'}
          activeOpacity={0.82}
          onPress={expandSearch}
          style={styles.searchTapTarget}
        >
          <Ionicons
            name="search"
            size={18}
            color={isSearchExpanded ? colors.primaryDark : colors.textSecondary}
            style={styles.searchIconCompact}
          />
          <Animated.View
            pointerEvents={isSearchExpanded ? 'auto' : 'none'}
            style={[styles.searchFieldWrap, { opacity: searchFieldOpacity }]}
          >
            <TextInput
              ref={inputRef}
              value={searchQuery}
              onChangeText={onSearchChange}
              onBlur={collapseSearch}
              editable={isSearchExpanded}
              style={styles.searchInputCompact}
              placeholder="Search..."
              placeholderTextColor={colors.textSecondary}
              returnKeyType="search"
              accessibilityLabel="Search tasks"
            />
          </Animated.View>
        </TouchableOpacity>
        {isSearchExpanded && searchQuery.length > 0 && (
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
      </Animated.View>

      <Animated.View
        pointerEvents={isSearchExpanded ? 'none' : 'auto'}
        style={[styles.filterChipsWrap, { opacity: filterChipsOpacity }]}
      >
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
                style={[
                  styles.filterChip,
                  { backgroundColor: isActive ? f.activeBg : f.inactiveBg },
                ]}
                onPress={() => onFilterChipPress(f.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? f.activeText : f.inactiveText },
                  ]}
                >
                  {f.emoji} {f.label} {count > 0 ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
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
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.xs,
    overflow: 'hidden',
  },
  searchTapTarget: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  searchFieldWrap: {
    flex: 1,
  },
  searchInputCompact: {
    height: 38,
    paddingLeft: 38,
    paddingRight: 32,
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
  },
  searchIconCompact: {
    position: 'absolute',
    left: 11,
    zIndex: 2,
  },
  searchClearBtnCompact: {
    position: 'absolute',
    right: 8,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray4,
    zIndex: 3,
  },
  searchClearTextCompact: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.bold,
    lineHeight: 16,
    includeFontPadding: false,
  },
  filterChipsWrap: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
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
