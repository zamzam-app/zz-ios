import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestionType } from '../../../../api/endpoints/forms';
import { colors, spacing, typography } from '../../../../theme/theme';

export function QuestionTypePickerSheet({
  visible,
  onSelect,
  onClose,
  options,
}: {
  visible: boolean;
  onSelect: (type: QuestionType) => void;
  onClose: () => void;
  options: { label: string; value: QuestionType }[];
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.modalHeader}>
          <View />
          <Text style={styles.modalTitle}>Question Type</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {options.map((t) => (
          <TouchableOpacity key={t.value} style={styles.typeRow} onPress={() => onSelect(t.value)}>
            <Text style={styles.typeLabel}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text },
  typeRow: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  typeLabel: { fontSize: typography.base, color: colors.text },
});
