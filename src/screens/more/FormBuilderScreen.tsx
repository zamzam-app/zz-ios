import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Form } from '../../api/endpoints/forms';
import { useForms, useCreateForm, useDeleteForm } from '../../hooks/tasks';
import type { MoreStackParamList } from '../../navigation/MoreNavigator';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import { FormBuilderList, FormEditorSheet } from './forms/components';

export default function FormBuilderScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { data: forms, isLoading, isFetching, refetch } = useForms();
  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [freshFormId, setFreshFormId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const handleCreate = () => {
    createForm.mutate(undefined, {
      onSuccess: (form) => {
        setFreshFormId(form.id);
        setEditingFormId(form.id);
      },
      onError: () => Alert.alert('Error', 'Failed to create form.'),
    });
  };

  const filteredForms = (forms ?? []).filter((form) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return form.title.toLowerCase().includes(term);
  });

  const handleDeleteForm = (form: Form) => {
    Alert.alert('Delete', `Delete "${form.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteForm.mutate(form.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleRowLeft}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => navigation.navigate('MoreMenu')}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.heading}>Form Builder</Text>
            </View>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleCreate}
              disabled={createForm.isPending}
            >
              {createForm.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.createBtnText}>+ New</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.subheading}>Manage review forms and questions for outlets</Text>
        </View>

        <FormBuilderList
          forms={forms ?? []}
          filteredForms={filteredForms}
          isLoading={isLoading}
          isFetching={isFetching}
          onRefresh={refetch}
          query={query}
          onQueryChange={setQuery}
          onEditForm={(id) => {
            setFreshFormId(null);
            setEditingFormId(id);
          }}
          onDeleteForm={handleDeleteForm}
        />
      </View>

      <FormEditorSheet
        visible={editingFormId !== null}
        formId={editingFormId}
        hideDefaultQuestions={Boolean(freshFormId && freshFormId === editingFormId)}
        onClose={() => {
          setEditingFormId(null);
          setFreshFormId(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },
  page: { flex: 1, paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 110 },
  header: { marginBottom: spacing.md, gap: spacing.xs },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 26,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  createBtn: {
    minWidth: 90,
    backgroundColor: colors.buttonPrimaryBg,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});
