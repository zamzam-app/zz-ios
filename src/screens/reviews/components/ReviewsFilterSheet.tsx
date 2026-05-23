import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';

export function ReviewsFilterSheet({
  visible,
  onClose,
  allReviewsFilter,
  setAllReviewsFilter,
}: {
  visible: boolean;
  onClose: () => void;
  allReviewsFilter: 'all' | 'open' | 'resolved' | 'critical' | 'concern';
  setAllReviewsFilter: (f: 'all' | 'open' | 'resolved' | 'critical' | 'concern') => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.filterModalRoot}>
        <TouchableOpacity activeOpacity={1} style={styles.filterModalScrim} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetTop}>
            <View style={styles.filterSheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filter Reviews</Text>
              <TouchableOpacity style={styles.filterSheetClose} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterBody}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status & Type</Text>
              <View style={styles.filterOptionsGrid}>
                {(['all', 'open', 'resolved', 'critical', 'concern'] as const).map((opt) => {
                  const active = opt === allReviewsFilter;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.filterOption, active && styles.filterOptionActive]}
                      onPress={() => {
                        setAllReviewsFilter(opt);
                        onClose();
                      }}
                    >
                      <Text
                        style={[styles.filterOptionText, active && styles.filterOptionTextActive]}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </Text>
                      {active && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterFooter}>
              <TouchableOpacity
                style={styles.filterClearBtn}
                onPress={() => {
                  setAllReviewsFilter('all');
                  onClose();
                }}
              >
                <Text style={styles.filterClearBtnText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  filterModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimBlack50,
  },
  filterSheet: {
    backgroundColor: colors.screenBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  filterSheetTop: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  filterSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.md,
  },
  filterSheetTitle: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: colors.text,
  },
  filterSheetClose: {
    padding: 4,
  },
  filterBody: {
    padding: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterSectionTitle: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: '47%',
  },
  filterOptionActive: {
    backgroundColor: colors.primaryTint,
    borderColor: colors.primaryTintStrong,
  },
  filterOptionText: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
    flex: 1,
  },
  filterOptionTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  filterFooter: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  filterClearBtn: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.uiGray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterClearBtnText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.textSecondary,
  },
});
