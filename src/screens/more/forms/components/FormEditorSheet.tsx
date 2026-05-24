import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestionType, QUESTION_TYPE_OPTIONS } from '../../../../api/endpoints/forms';
import { colors, spacing, radius, typography } from '../../../../theme/theme';
import { useFormEditorState } from '../hooks/useFormEditorState';

import { QuestionEditorCard } from './QuestionEditorCard';
import { QuestionTypePickerSheet } from './QuestionTypePickerSheet';

export function FormEditorSheet({
  visible,
  formId,
  onClose,
  hideDefaultQuestions = false,
}: {
  visible: boolean;
  formId: string | null;
  onClose: () => void;
  hideDefaultQuestions?: boolean;
}) {
  const {
    isLoading,
    isUpdating,
    title,
    setTitle,
    questions,
    showAddQuestion,
    setShowAddQuestion,
    handleSave,
    addQuestion,
    updateQuestion,
    removeQuestion,
    nextTempId,
  } = useFormEditorState(formId, hideDefaultQuestions);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Form</Text>
            <TouchableOpacity onPress={() => handleSave(onClose)} disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: typography.semibold }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
          ) : (
            <ScrollView
              contentContainerStyle={styles.editorScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Form Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Untitled Form"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={[styles.label, { marginTop: spacing.md }]}>
                Questions ({questions.length})
              </Text>

              {questions.map((q, index) => (
                <QuestionEditorCard
                  key={q._id}
                  question={q}
                  index={index}
                  onUpdate={updateQuestion}
                  onRemove={removeQuestion}
                  nextTempId={nextTempId}
                />
              ))}

              <TouchableOpacity
                style={styles.addQuestionBtn}
                onPress={() => setShowAddQuestion(true)}
              >
                <Text style={styles.addQuestionText}>+ Add Question</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      <QuestionTypePickerSheet
        visible={showAddQuestion}
        onSelect={addQuestion}
        onClose={() => setShowAddQuestion(false)}
        options={QUESTION_TYPE_OPTIONS as unknown as { label: string; value: QuestionType }[]}
      />
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
  editorScroll: { padding: spacing.md, paddingBottom: 120, gap: spacing.sm },
  label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.text },
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
  addQuestionBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addQuestionText: {
    color: colors.primary,
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
});
