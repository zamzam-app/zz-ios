import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

import { Task } from '../../../api/endpoints/tasks';
import { colors } from '../../../theme/theme';
import { CreateTaskContent } from '../CreateTaskScreen';

interface TaskEditSheetProps {
  visible: boolean;
  onClose: () => void;
  editTask?: Task;
  onSuccess?: () => void;
}

export function TaskEditSheet({ visible, onClose, editTask, onSuccess }: TaskEditSheetProps) {
  if (!visible) return null;

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

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
          {editTask?.id ? (
            <CreateTaskContent
              mode="edit"
              onSuccess={handleSuccess}
              editTask={editTask}
              submitLabel="Save Changes"
              bottomPadding={24}
              fill
              backgroundColor={colors.surface}
            />
          ) : (
            <View style={styles.editLoadingWrap}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.editLoadingText}>Loading task details...</Text>
            </View>
          )}
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
  editLoadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  editLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
