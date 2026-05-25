import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';

import { colors } from '../../../theme/theme';
import { CreateTaskContent } from '../CreateTaskScreen';

interface TaskEditSheetProps {
  visible: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  legacyTask?: any;
}

export function TaskEditSheet({ visible, onClose, legacyTask }: TaskEditSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.editModalRoot}>
        <TouchableOpacity activeOpacity={1} style={styles.editModalScrim} onPress={onClose} />
        <View style={styles.editSheet}>
          <View style={styles.editSheetTop}>
            <View style={styles.editSheetHandle} />
            <View style={styles.editSheetHeader}>
              <Text style={styles.editSheetTitle}>Edit Task</Text>
              <TouchableOpacity style={styles.editSheetClose} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <CreateTaskContent
            onSuccess={onClose}
            editTask={legacyTask ?? undefined}
            submitLabel="Save Changes"
            bottomPadding={24}
            fill
            backgroundColor={colors.surface}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  editModalRoot: { flex: 1, justifyContent: 'flex-end' },
  editModalScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrimBlack40 },
  editSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    overflow: 'hidden',
  },
  editSheetTop: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.uiGray4,
    marginBottom: 12,
  },
  editSheetHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editSheetTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  editSheetClose: { padding: 4 },
});
