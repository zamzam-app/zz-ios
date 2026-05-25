import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';

import DatePickerModal from '../../../components/shared/DatePickerModal';
import { colors, spacing, radius, typography } from '../../../theme/theme';
import type { PriorityFilter, FilterSection } from '../hooks/useTasksBoardState';

const PRIORITY_FILTERS: { label: string; value: PriorityFilter }[] = [
  { label: 'All priorities', value: 'ALL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

interface TaskFilterSheetProps {
  visible: boolean;
  priorityFilter: PriorityFilter;
  dueDateFilter: Date | null;
  activeFilterSection: FilterSection;
  showDueDatePicker: boolean;
  onClose: () => void;
  onPriorityChange: (value: PriorityFilter) => void;
  onDueDateChange: (date: Date) => void;
  onClearDueDate: () => void;
  onClearFilters: () => void;
  onFilterSectionChange: (section: FilterSection) => void;
  onShowDueDatePicker: (show: boolean) => void;
}

export function TaskFilterSheet({
  visible,
  priorityFilter,
  dueDateFilter,
  activeFilterSection,
  showDueDatePicker,
  onClose,
  onPriorityChange,
  onDueDateChange,
  onClearDueDate,
  onClearFilters,
  onFilterSectionChange,
  onShowDueDatePicker,
}: TaskFilterSheetProps) {
  const formatFilterDate = (date: Date) =>
    date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.createModalRoot}>
        <TouchableOpacity activeOpacity={1} style={styles.createModalScrim} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.createSheetTop}>
            <View style={styles.createSheetHandle} />
            <View style={styles.createSheetHeader}>
              <Text style={styles.createSheetTitle}>Filters</Text>
              <TouchableOpacity style={styles.createSheetClose} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterBody}>
            <View style={styles.filterSidebar}>
              <TouchableOpacity
                style={[
                  styles.filterSidebarItem,
                  activeFilterSection === 'priority' && styles.filterSidebarItemActive,
                ]}
                onPress={() => onFilterSectionChange('priority')}
              >
                <Text
                  style={[
                    styles.filterSidebarItemText,
                    activeFilterSection === 'priority' && styles.filterSidebarItemTextActive,
                  ]}
                >
                  Priority
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterSidebarItem,
                  activeFilterSection === 'dueDate' && styles.filterSidebarItemActive,
                ]}
                onPress={() => onFilterSectionChange('dueDate')}
              >
                <Text
                  style={[
                    styles.filterSidebarItemText,
                    activeFilterSection === 'dueDate' && styles.filterSidebarItemTextActive,
                  ]}
                >
                  Due Date
                </Text>
              </TouchableOpacity>
              <View style={styles.filterSidebarFooter}>
                <TouchableOpacity
                  style={styles.filterSidebarClearBtn}
                  onPress={onClearFilters}
                  activeOpacity={0.82}
                >
                  <Text style={styles.filterSidebarClearBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.filterContent}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
              showsVerticalScrollIndicator={false}
            >
              {activeFilterSection === 'priority' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Filter by priority</Text>
                  {PRIORITY_FILTERS.map((option, index) => {
                    const active = option.value === priorityFilter;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.priorityOption,
                          index < PRIORITY_FILTERS.length - 1 && styles.priorityOptionDivider,
                          active && styles.priorityOptionActive,
                        ]}
                        onPress={() => onPriorityChange(option.value)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.priorityOptionText,
                            active && styles.priorityOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {activeFilterSection === 'dueDate' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Filter by due date</Text>
                  <Text style={styles.filterSectionHint}>
                    {dueDateFilter
                      ? `Selected: ${formatFilterDate(dueDateFilter)}`
                      : 'No date selected'}
                  </Text>
                  {!showDueDatePicker && (
                    <TouchableOpacity
                      style={styles.filterActionBtn}
                      onPress={() => onShowDueDatePicker(true)}
                      activeOpacity={0.82}
                    >
                      <Text style={styles.filterActionBtnText}>
                        {dueDateFilter ? 'Change Date' : 'Select Date'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {dueDateFilter && !showDueDatePicker && (
                    <TouchableOpacity
                      style={[styles.filterActionBtn, styles.filterActionBtnSecondary]}
                      onPress={onClearDueDate}
                      activeOpacity={0.82}
                    >
                      <Text
                        style={[styles.filterActionBtnText, styles.filterActionBtnSecondaryText]}
                      >
                        Clear Date
                      </Text>
                    </TouchableOpacity>
                  )}
                  <DatePickerModal
                    visible={showDueDatePicker}
                    value={dueDateFilter ?? new Date()}
                    onClose={() => onShowDueDatePicker(false)}
                    onChange={onDueDateChange}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  createModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  createModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimDark40,
  },
  filterSheet: {
    maxHeight: '88%',
    minHeight: 360,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  filterBody: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 300,
  },
  filterSidebar: {
    width: 118,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.screenBackground,
    paddingVertical: spacing.xs,
  },
  filterSidebarFooter: {
    marginTop: 'auto',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  filterSidebarClearBtn: {
    minHeight: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  filterSidebarClearBtnText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterSidebarItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.transparent,
  },
  filterSidebarItemActive: {
    backgroundColor: colors.primaryTint,
    borderLeftColor: colors.primary,
  },
  filterSidebarItemText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  filterSidebarItemTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterSectionTitle: {
    fontSize: typography.md,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  filterSectionHint: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  filterActionBtn: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  filterActionBtnText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: typography.semibold,
  },
  filterActionBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActionBtnSecondaryText: {
    color: colors.text,
  },
  createSheetTop: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorderAlpha25,
    backgroundColor: colors.surfaceOverlay,
  },
  createSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.uiGray4,
    marginBottom: spacing.sm,
  },
  createSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createSheetTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  createSheetClose: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray1,
  },
  priorityOption: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  priorityOptionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  priorityOptionActive: {
    backgroundColor: colors.primaryTint,
  },
  priorityOptionText: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
  },
  priorityOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
});
