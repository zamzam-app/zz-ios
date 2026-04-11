import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForms, useCreateForm, useUpdateForm, useDeleteForm, useForm } from '../../hooks/useForms';
import { Form, Question, QuestionType } from '../../api/endpoints/forms';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

const QUESTION_TYPES: { label: string; value: QuestionType }[] = [
  { label: 'Short Answer', value: 'short_answer' },
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Multiple Choice', value: 'multiple_choice' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Rating', value: 'rating' },
];

// ─── Form Editor Modal ────────────────────────────────────────────────────────

function FormEditorModal({ visible, formId, onClose }: {
  visible: boolean; formId: string | null; onClose: () => void;
}) {
  const { data: form, isLoading } = useForm(formId ?? '');
  const updateForm = useUpdateForm();

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  useEffect(() => {
    if (form) {
      setTitle(form.title);
      setQuestions(form.questions);
    }
  }, [form]);

  const handleSave = () => {
    if (!formId || !title.trim()) return Alert.alert('Required', 'Form title is required.');
    updateForm.mutate(
      { id: formId, title: title.trim(), questions },
      { onSuccess: onClose, onError: () => Alert.alert('Error', 'Failed to save form.') },
    );
  };

  const addQuestion = (type: QuestionType) => {
    const newQ: Question = {
      _id: `temp_${Date.now()}`,
      type,
      title: '',
      isRequired: false,
      ...(type === 'multiple_choice' || type === 'checkbox' ? { options: [{ text: '' }] } : {}),
      ...(type === 'rating' ? { maxRatings: 5 } : {}),
    };
    setQuestions((prev) => [...prev, newQ]);
    setShowAddQuestion(false);
  };

  const updateQuestion = (index: number, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Form</Text>
            <TouchableOpacity onPress={handleSave} disabled={updateForm.isPending}>
              {updateForm.isPending ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: typography.semibold }}>Save</Text>}
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
          ) : (
            <ScrollView contentContainerStyle={styles.editorScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Form Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Untitled Form"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={[styles.label, { marginTop: spacing.md }]}>Questions ({questions.length})</Text>

              {questions.map((q, index) => (
                <View key={q._id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.qTypePill}>
                      <Text style={styles.qTypeText}>{q.type.replace(/_/g, ' ')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeQuestion(index)}>
                      <Text style={styles.deleteText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={q.title}
                    onChangeText={(v) => updateQuestion(index, { title: v })}
                    placeholder="Question text..."
                    placeholderTextColor={colors.textDisabled}
                  />
                  {(q.type === 'multiple_choice' || q.type === 'checkbox') && (
                    <View style={{ gap: spacing.xs }}>
                      {(q.options ?? []).map((opt, oi) => (
                        <View key={oi} style={styles.optionRow}>
                          <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={opt.text}
                            onChangeText={(v) => {
                              const newOptions = [...(q.options ?? [])];
                              newOptions[oi] = { text: v };
                              updateQuestion(index, { options: newOptions });
                            }}
                            placeholder={`Option ${oi + 1}`}
                            placeholderTextColor={colors.textDisabled}
                          />
                          <TouchableOpacity onPress={() => {
                            const newOptions = (q.options ?? []).filter((_, i) => i !== oi);
                            updateQuestion(index, { options: newOptions });
                          }}>
                            <Text style={styles.deleteText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity onPress={() => updateQuestion(index, { options: [...(q.options ?? []), { text: '' }] })}>
                        <Text style={{ color: colors.primary, fontSize: typography.sm }}>+ Add option</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {q.type === 'rating' && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.label}>Max stars:</Text>
                      {[3, 5, 10].map((n) => (
                        <TouchableOpacity key={n} style={[styles.chip, q.maxRatings === n && styles.chipActive]} onPress={() => updateQuestion(index, { maxRatings: n })}>
                          <Text style={[styles.chipText, q.maxRatings === n && styles.chipTextActive]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.requiredRow}
                    onPress={() => updateQuestion(index, { isRequired: !q.isRequired })}
                  >
                    <View style={[styles.checkbox, q.isRequired && styles.checkboxChecked]}>
                      {q.isRequired && <Text style={{ color: colors.textInverse, fontSize: 10 }}>✓</Text>}
                    </View>
                    <Text style={styles.requiredLabel}>Required</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.addQuestionBtn} onPress={() => setShowAddQuestion(true)}>
                <Text style={styles.addQuestionText}>+ Add Question</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Question type picker */}
      <Modal visible={showAddQuestion} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <View />
            <Text style={styles.modalTitle}>Question Type</Text>
            <TouchableOpacity onPress={() => setShowAddQuestion(false)}>
              <Text style={{ color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {QUESTION_TYPES.map((t) => (
            <TouchableOpacity key={t.value} style={styles.typeRow} onPress={() => addQuestion(t.value)}>
              <Text style={styles.typeLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FormBuilderScreen() {
  const { data: forms, isLoading, isFetching, refetch } = useForms();
  const createForm = useCreateForm();
  const deleteForm = useDeleteForm();
  const [editingFormId, setEditingFormId] = useState<string | null>(null);

  const handleCreate = () => {
    createForm.mutate(undefined, {
      onSuccess: (form) => setEditingFormId(form.id),
      onError: () => Alert.alert('Error', 'Failed to create form.'),
    });
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <FlatList
        data={forms ?? []}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        refreshing={isFetching && !isLoading}
        onRefresh={refetch}
        ListHeaderComponent={isLoading ? <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} /> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.questions.length} question{item.questions.length !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => setEditingFormId(item.id)}>
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Delete', `Delete "${item.title}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteForm.mutate(item.id) },
              ])}>
                <Text style={styles.deleteText}>Del</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No forms yet</Text> : null}
      />

      <View style={styles.fab}>
        <TouchableOpacity style={styles.fabBtn} onPress={handleCreate} disabled={createForm.isPending}>
          {createForm.isPending ? <ActivityIndicator color={colors.textInverse} /> : <Text style={styles.fabText}>+ New Form</Text>}
        </TouchableOpacity>
      </View>

      <FormEditorModal
        visible={editingFormId !== null}
        formId={editingFormId}
        onClose={() => setEditingFormId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', ...shadow.sm },
  itemName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  itemDesc: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.md },
  editText: { color: colors.primary, fontSize: typography.sm, fontWeight: typography.medium },
  deleteText: { color: colors.error, fontSize: typography.sm, fontWeight: typography.medium },
  fab: { position: 'absolute', bottom: spacing.xl, left: spacing.md, right: spacing.md },
  fabBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  fabText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text },
  editorScroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: typography.base, color: colors.text, backgroundColor: colors.surface },

  questionCard: { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qTypePill: { backgroundColor: colors.primary + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  qTypeText: { fontSize: typography.xs, color: colors.primary, fontWeight: typography.medium },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse, fontWeight: typography.medium },
  requiredRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  requiredLabel: { fontSize: typography.sm, color: colors.textSecondary },
  addQuestionBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', borderStyle: 'dashed' },
  addQuestionText: { color: colors.primary, fontSize: typography.base, fontWeight: typography.medium },
  typeRow: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  typeLabel: { fontSize: typography.base, color: colors.text },
});
