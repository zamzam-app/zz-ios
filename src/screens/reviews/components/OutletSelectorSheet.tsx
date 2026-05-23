import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';
import type { OutletOption } from '../hooks/useReviewsFilterState';

export function OutletSelectorSheet({
  visible,
  onClose,
  outletOptions,
  selectedOutletId,
  onSelectOutlet,
}: {
  visible: boolean;
  onClose: () => void;
  outletOptions: OutletOption[];
  selectedOutletId: string;
  onSelectOutlet: (id: string, isAll: boolean) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.filterModalRoot}>
        <TouchableOpacity activeOpacity={1} style={styles.filterModalScrim} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetTop}>
            <View style={styles.filterSheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Select Outlet</Text>
              <TouchableOpacity style={styles.filterSheetClose} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.filterBody, { maxHeight: 400, paddingBottom: 0 }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
              <View style={styles.filterOptionsGrid}>
                {outletOptions.map((opt) => {
                  const active = opt.id === selectedOutletId;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.filterOption,
                        active && styles.filterOptionActive,
                        { minWidth: '100%' },
                      ]}
                      onPress={() => onSelectOutlet(opt.id, opt.id === 'all')}
                    >
                      <Text
                        style={[styles.filterOptionText, active && styles.filterOptionTextActive]}
                      >
                        {opt.label}
                      </Text>
                      {active && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
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
});
