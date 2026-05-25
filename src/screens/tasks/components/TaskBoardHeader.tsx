import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import TaskQueueStatusBanner from '../../../components/TaskQueueStatusBanner';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';

interface TaskBoardHeaderProps {
  isAdmin: boolean;
  isManager: boolean;
  activeTab: 'NORMAL' | 'RECURRING';
  onTabChange: (tab: 'NORMAL' | 'RECURRING') => void;
  onNavigateToCategories: () => void;
  onCreatePress: () => void;
}

export function TaskBoardHeader({
  isAdmin,
  isManager,
  activeTab,
  onTabChange,
  onNavigateToCategories,
  onCreatePress,
}: TaskBoardHeaderProps) {
  return (
    <>
      <View style={styles.header}>
        <View style={{ flexShrink: 1, marginRight: spacing.sm }}>
          <Text style={styles.heading} numberOfLines={1}>
            Task Board
          </Text>
          <Text style={styles.subheading} numberOfLines={1}>
            Manage and assign outlet operations.
          </Text>
        </View>
        <View style={styles.headerBtns}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onNavigateToCategories}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>Categories</Text>
            </TouchableOpacity>
          )}
          {!isManager && (
            <TouchableOpacity style={styles.createBtn} onPress={onCreatePress} activeOpacity={0.84}>
              <Text style={styles.createBtnText}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <TaskQueueStatusBanner />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'NORMAL' && styles.tabItemActive]}
          onPress={() => onTabChange('NORMAL')}
        >
          <Text style={[styles.tabText, activeTab === 'NORMAL' && styles.tabTextActive]}>
            Normal Task
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'RECURRING' && styles.tabItemActive]}
          onPress={() => onTabChange('RECURRING')}
        >
          <Text style={[styles.tabText, activeTab === 'RECURRING' && styles.tabTextActive]}>
            Recurring Task
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  heading: {
    fontSize: 26,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha50,
    backgroundColor: colors.buttonLightBg,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  createBtn: {
    backgroundColor: colors.buttonPrimaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.uiGray2,
    borderRadius: radius.lg,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.accentCaramelText,
    fontWeight: typography.bold,
  },
});
