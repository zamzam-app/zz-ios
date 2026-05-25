import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import type { Outlet } from '../../../api/endpoints/outlets';
import { colors, spacing, radius, typography } from '../../../theme/theme';

import { OutletFormContent } from './OutletForm';

interface OutletEditorSheetProps {
  visible: boolean;
  mode?: 'create' | 'edit';
  outlet?: Outlet | null;
  onClose: () => void;
  onSuccess: () => void;
}

function OutletEditorSheet({
  visible,
  mode = 'create',
  outlet,
  onClose,
  onSuccess,
}: OutletEditorSheetProps) {
  const isEdit = mode === 'edit';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity activeOpacity={1} style={styles.modalScrim} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          <View style={styles.sheetTop}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{isEdit ? 'Edit Outlet' : 'Create Outlet'}</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={onClose}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <OutletFormContent
            mode={isEdit ? 'edit' : undefined}
            outletToEdit={isEdit ? outlet : undefined}
            onSuccess={onSuccess}
            submitLabel={isEdit ? 'Save Changes' : undefined}
            bottomPadding={20}
            fill={false}
            backgroundColor={colors.surface}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default React.memo(OutletEditorSheet);

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimDark40,
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 24,
  },
  sheetTop: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorderAlpha25,
    backgroundColor: colors.surfaceOverlay,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.uiGray4,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray1,
  },
});
