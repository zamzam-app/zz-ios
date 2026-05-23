import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Outlet } from '../../../api/endpoints/outlets';
import { colors, spacing, radius, typography } from '../../../theme/theme';
import { useOutletFormState } from '../hooks/useOutletFormState';

import { Label, PickerModal } from './OutletPickers';

interface OutletFormContentProps {
  mode?: 'create' | 'edit';
  outletToEdit?: Outlet | null;
  onSuccess: () => void;
  submitLabel?: string;
  bottomPadding?: number;
  fill?: boolean;
  backgroundColor?: string;
}

export function OutletFormContent({
  mode = 'create',
  outletToEdit = null,
  onSuccess,
  submitLabel = mode === 'edit' ? 'Save Changes' : 'Create Outlet',
  bottomPadding = 120,
  fill = true,
  backgroundColor = colors.background,
}: OutletFormContentProps) {
  const {
    name,
    setName,
    description,
    setDescription,
    address,
    setAddress,
    outletTypeId,
    setOutletTypeId,
    formId,
    setFormId,
    managerIds,
    showTypePicker,
    setShowTypePicker,
    showFormPicker,
    setShowFormPicker,
    showManagerPicker,
    setShowManagerPicker,
    outletTypes,
    forms,
    managers,
    isLoadingOutletTypes,
    isOutletTypesError,
    isFetchingOutletTypes,
    refetchOutletTypes,
    selectedType,
    selectedForm,
    selectedManagers,
    isSubmitting,
    isAdmin,
    toggleManager,
    handleSubmit,
  } = useOutletFormState({ mode, outletToEdit, onSuccess });

  return (
    <View style={[fill ? styles.rootFill : styles.rootAuto, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <Label text="Name" required />
        <TextInput
          style={styles.input}
          placeholder="Outlet name"
          placeholderTextColor={colors.textDisabled}
          value={name}
          onChangeText={setName}
        />

        <Label text="Description" />
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Describe this outlet..."
          placeholderTextColor={colors.textDisabled}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Label text="Address" />
        <TextInput
          style={styles.input}
          placeholder="Street address"
          placeholderTextColor={colors.textDisabled}
          value={address}
          onChangeText={setAddress}
        />

        <Label text="Outlet Type" required />
        {isLoadingOutletTypes ? (
          <View style={styles.fieldState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isOutletTypesError ? (
          <View style={styles.fieldState}>
            <Text style={styles.fieldError}>Unable to load outlet types.</Text>
            <TouchableOpacity
              style={[styles.retryBtn, isFetchingOutletTypes && styles.retryBtnDisabled]}
              onPress={() => {
                void refetchOutletTypes();
              }}
              disabled={isFetchingOutletTypes}
            >
              {isFetchingOutletTypes ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.retryBtnText}>Retry</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.input} onPress={() => setShowTypePicker(true)}>
            <Text style={{ color: selectedType ? colors.text : colors.textDisabled }}>
              {selectedType?.name ?? 'Select type...'}
            </Text>
          </TouchableOpacity>
        )}

        <Label text="Managers" />
        <TouchableOpacity style={styles.input} onPress={() => setShowManagerPicker(true)}>
          <Text style={{ color: selectedManagers.length > 0 ? colors.text : colors.textDisabled }}>
            {selectedManagers.length > 0
              ? selectedManagers.map((m) => m.name).join(', ')
              : 'Select managers...'}
          </Text>
        </TouchableOpacity>

        <Label text="Form" />
        <TouchableOpacity style={styles.input} onPress={() => setShowFormPicker(true)}>
          <Text style={{ color: selectedForm ? colors.text : colors.textDisabled }}>
            {selectedForm?.title ?? 'Select form...'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, (isSubmitting || !isAdmin) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isSubmitting || !isAdmin}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitBtnText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
        {!isAdmin && <Text style={styles.helperText}>Only admins can create outlets.</Text>}
      </ScrollView>

      <PickerModal
        visible={showTypePicker}
        title="Select Outlet Type"
        items={outletTypes ?? []}
        selected={outletTypeId}
        onSelect={(id) => {
          setOutletTypeId(id);
          setShowTypePicker(false);
        }}
        onClose={() => setShowTypePicker(false)}
      />
      <PickerModal
        visible={showManagerPicker}
        title="Select Managers"
        items={managers ?? []}
        selected={managerIds}
        multi
        onSelect={toggleManager}
        onClose={() => setShowManagerPicker(false)}
      />
      <PickerModal
        visible={showFormPicker}
        title="Select Form"
        items={(forms ?? []).map((f) => ({ id: f.id, name: f.title }))}
        selected={formId}
        onSelect={(id) => {
          setFormId(id);
          setShowFormPicker(false);
        }}
        onClose={() => setShowFormPicker(false)}
      />
    </View>
  );
}

export default function OutletForm() {
  return (
    <SafeAreaView
      style={[styles.rootFill, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <OutletFormContent onSuccess={() => undefined} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootFill: { flex: 1 },
  rootAuto: {},
  scroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  fieldState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  fieldError: { color: colors.error, fontSize: typography.sm },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnDisabled: { opacity: 0.7 },
  retryBtnText: { color: colors.primary, fontSize: typography.sm, fontWeight: typography.medium },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitBtnText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  helperText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: typography.xs,
    textAlign: 'center',
  },
});
