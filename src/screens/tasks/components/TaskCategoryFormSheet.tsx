import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';

import { TaskCategoryOption } from '../../../api/endpoints/tasks';
import { colors, spacing, radius, typography } from '../../../theme/theme';

interface TaskCategoryFormSheetProps {
  visible: boolean;
  initial?: TaskCategoryOption;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  submitting: boolean;
}

export function TaskCategoryFormSheet({
  visible,
  initial,
  onClose,
  onSubmit,
  submitting,
}: TaskCategoryFormSheetProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      const nextName = initial?.name ?? '';
      const nextDescription = initial?.description ?? '';
      queueMicrotask(() => {
        setName(nextName);
        setDescription(nextDescription);
        setNameError(null);
        setDescriptionError(null);
      });
    }
  }, [visible, initial]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    let hasError = false;
    if (trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters.');
      hasError = true;
    } else {
      setNameError(null);
    }

    if (trimmedDescription.length < 5) {
      setDescriptionError('Description must be at least 5 characters.');
      hasError = true;
    } else {
      setDescriptionError(null);
    }

    if (hasError) return;
    onSubmit(trimmedName, trimmedDescription);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableOpacity activeOpacity={1} style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetTop}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{initial ? 'Edit Category' : 'Create Category'}</Text>
              <TouchableOpacity style={styles.sheetClose} onPress={onClose} disabled={submitting}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.formInner}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, nameError && styles.inputError]}
              placeholder="e.g. Cleaning, Maintenance"
              placeholderTextColor={colors.textDisabled}
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (nameError) setNameError(null);
              }}
            />
            {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput, descriptionError && styles.inputError]}
              placeholder="Brief description..."
              placeholderTextColor={colors.textDisabled}
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                if (descriptionError) setDescriptionError(null);
              }}
              multiline
            />
            {descriptionError ? <Text style={styles.fieldError}>{descriptionError}</Text> : null}

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {initial ? 'Save Changes' : 'Create Category'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
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
    gap: spacing.sm,
  },
  sheetTitle: {
    flex: 1,
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

  formInner: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  descriptionInput: {
    height: 108,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    fontSize: typography.xs,
    color: colors.error,
    marginTop: 4,
  },
  formActions: {
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha50,
    backgroundColor: colors.buttonLightBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
  submitBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  submitBtnText: {
    color: colors.textInverse,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
});
