import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Question,
  QuestionType,
  QUESTION_TYPE_OPTIONS,
  SupportedQuestion,
} from '../../api/endpoints/forms';
import {
  useForms,
  useCreateForm,
  useUpdateForm,
  useDeleteForm,
  useForm,
} from '../../hooks/tasks';
import type { MoreStackParamList } from '../../navigation/MoreNavigator';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

// ─── Form Editor Modal ────────────────────────────────────────────────────────

function FormEditorModal({
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
  const { data: form, isLoading } = useForm(formId ?? '');
  const updateForm = useUpdateForm();

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const tempIdCounterRef = useRef(0);
  const nextTempId = useCallback(() => {
    tempIdCounterRef.current += 1;
    return tempIdCounterRef.current;
  }, []);

  const ensureOptionIds = useCallback(
    (input: Question[]): Question[] =>
      input.map((q) => {
        if (!Array.isArray(q.options) || q.options.length === 0) return q;
        return {
          ...q,
          options: q.options.map((opt) => ({
            ...opt,
            _id: opt._id ?? `temp_opt_${q._id}_${nextTempId()}`,
          })),
        };
      }),
    [nextTempId],
  );

  const isDefaultPlaceholderQuestion = (question: Question) => {
    const title = question.title.trim().toLowerCase();
    const isPlaceholderTitle =
      title.length === 0 || /^question\s*\d+$/i.test(title) || title === 'untitled question';
    const hasHint = typeof question.hint === 'string' && question.hint.trim().length > 0;
    const hasFilledOptions =
      Array.isArray(question.options) &&
      question.options.some((option) => option.text.trim().length > 0);
    const hasNonDefaultRating =
      question.type === 'rating' && typeof question.maxRatings === 'number'
        ? question.maxRatings !== 5
        : false;

    return (
      isPlaceholderTitle &&
      !question.isRequired &&
      !hasHint &&
      !hasFilledOptions &&
      !hasNonDefaultRating
    );
  };

  useEffect(() => {
    if (form) {
      const nextTitle = form.title;
      const nextQuestions = hideDefaultQuestions
        ? []
        : form.questions.filter((question) => !isDefaultPlaceholderQuestion(question));

      queueMicrotask(() => {
        setTitle(nextTitle);
        setQuestions(ensureOptionIds(nextQuestions));
      });
    }
  }, [form, hideDefaultQuestions, ensureOptionIds]);

  const handleSave = () => {
    if (!formId || !title.trim()) return Alert.alert('Required', 'Form title is required.');
    updateForm.mutate(
      { id: formId, title: title.trim(), questions },
      { onSuccess: onClose, onError: () => Alert.alert('Error', 'Failed to save form.') },
    );
  };

  const addQuestion = (type: QuestionType) => {
    const tempId = nextTempId();
    const newQ: Question = {
      _id: `temp_${tempId}`,
      type,
      title: '',
      isRequired: false,
      ...(type === 'multiple_choice' || type === 'checkbox'
        ? { options: [{ _id: `temp_opt_temp_${tempId}_${nextTempId()}`, text: '' }] }
        : {}),
      ...(type === 'rating' ? { maxRatings: 5 } : {}),
    };
    setQuestions((prev) => [...prev, newQ]);
    setShowAddQuestion(false);
  };

  const updateQuestion = (index: number, patch: Partial<Omit<SupportedQuestion, 'type'>>) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index || q.type === 'unsupported') return q;
        return { ...q, ...patch };
      }),
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const getQuestionTypeLabel = (question: Question) => {
    if (question.type === 'unsupported') return `Unsupported (${question.rawType})`;
    return (
      QUESTION_TYPE_OPTIONS.find((option) => option.value === question.type)?.label ?? question.type
    );
  };

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
            <TouchableOpacity onPress={handleSave} disabled={updateForm.isPending}>
              {updateForm.isPending ? (
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
                <View key={q._id} style={styles.questionCard}>
                  <View style={styles.questionHeader}>
                    <View style={styles.qTypePill}>
                      <Text style={styles.qTypeText}>{getQuestionTypeLabel(q)}</Text>
                    </View>
                    {!q.isDefault && (
                      <TouchableOpacity onPress={() => removeQuestion(index)}>
                        <Text style={styles.deleteText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {q.type === 'unsupported' ? (
                    <View style={styles.unsupportedCard}>
                      <Text style={styles.unsupportedTitle}>Unsupported question type</Text>
                      <Text style={styles.unsupportedType}>{q.rawType}</Text>
                      {!!q.title && <Text style={styles.unsupportedText}>Title: {q.title}</Text>}
                    </View>
                  ) : (
                    <>
                      <TextInput
                        style={[
                          styles.input,
                          q.isDefault && { opacity: 0.7, backgroundColor: colors.background },
                        ]}
                        value={q.title}
                        editable={!q.isDefault}
                        onChangeText={(v) => updateQuestion(index, { title: v })}
                        placeholder="Question text..."
                        placeholderTextColor={colors.textDisabled}
                      />
                      {(q.type === 'multiple_choice' || q.type === 'checkbox') && (
                        <View style={{ gap: spacing.xs }}>
                          {(q.options ?? []).map((opt) => (
                            <View key={opt._id ?? `${q._id}-${opt.text}`} style={styles.optionRow}>
                              <TextInput
                                style={[
                                  styles.input,
                                  { flex: 1, marginBottom: 0 },
                                  q.isDefault && {
                                    opacity: 0.7,
                                    backgroundColor: colors.background,
                                  },
                                ]}
                                value={opt.text}
                                editable={!q.isDefault}
                                onChangeText={(v) => {
                                  const newOptions = [...(q.options ?? [])];
                                  const targetIndex = newOptions.findIndex(
                                    (o) => o._id === opt._id,
                                  );
                                  if (targetIndex === -1) return;
                                  newOptions[targetIndex] = { ...newOptions[targetIndex], text: v };
                                  updateQuestion(index, { options: newOptions });
                                }}
                                placeholder="Option..."
                                placeholderTextColor={colors.textDisabled}
                              />
                              {!q.isDefault && (
                                <TouchableOpacity
                                  onPress={() => {
                                    const newOptions = (q.options ?? []).filter(
                                      (o) => o._id !== opt._id,
                                    );
                                    updateQuestion(index, { options: newOptions });
                                  }}
                                >
                                  <Text style={styles.deleteText}>✕</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                          {!q.isDefault && (
                            <TouchableOpacity
                              onPress={() =>
                                updateQuestion(index, {
                                  options: [
                                    ...(q.options ?? []),
                                    { _id: `temp_opt_${q._id}_${nextTempId()}`, text: '' },
                                  ],
                                })
                              }
                            >
                              <Text style={{ color: colors.primary, fontSize: typography.sm }}>
                                + Add option
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                      {q.type === 'rating' && (
                        <View style={styles.ratingRow}>
                          <Text style={styles.label}>Max stars:</Text>
                          {[3, 5, 10].map((n) => (
                            <TouchableOpacity
                              key={n}
                              style={[
                                styles.chip,
                                q.maxRatings === n && styles.chipActive,
                                q.isDefault && { opacity: 0.7 },
                              ]}
                              disabled={q.isDefault}
                              onPress={() => updateQuestion(index, { maxRatings: n })}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  q.maxRatings === n && styles.chipTextActive,
                                ]}
                              >
                                {n}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.requiredRow}
                        disabled={q.isDefault}
                        onPress={() => updateQuestion(index, { isRequired: !q.isRequired })}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            q.isRequired && styles.checkboxChecked,
                            q.isDefault && { opacity: 0.7 },
                          ]}
                        >
                          {q.isRequired && (
                            <Text style={{ color: colors.textInverse, fontSize: 10 }}>✓</Text>
                          )}
                        </View>
                        <Text style={[styles.requiredLabel, q.isDefault && { opacity: 0.7 }]}>
                          Required
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
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
          {QUESTION_TYPE_OPTIONS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={styles.typeRow}
              onPress={() => addQuestion(t.value)}
            >
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

        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Search forms..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <View style={styles.listShell}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Available Forms</Text>
            <View style={styles.totalChip}>
              <Text style={styles.totalChipText}>{(forms ?? []).length} TOTAL</Text>
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={filteredForms}
              keyExtractor={(f) => f.id}
              contentContainerStyle={styles.listContent}
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.title}</Text>
                    <Text style={styles.itemDesc}>
                      {item.questions.length} question{item.questions.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setFreshFormId(null);
                        setEditingFormId(item.id);
                      }}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() =>
                        Alert.alert('Delete', `Delete "${item.title}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteForm.mutate(item.id),
                          },
                        ])
                      }
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No forms found</Text>}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>

      <FormEditorModal
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
  searchWrap: {
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  searchInput: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 38,
    paddingRight: spacing.md,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  listShell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha18,
    padding: spacing.sm,
    ...shadow.sm,
  },
  listHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accentBrownText,
    fontWeight: typography.bold,
  },
  totalChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.uiGray4,
  },
  totalChipText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
  },
  listContent: { gap: spacing.sm, paddingBottom: 120 },
  loader: { marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha18,
  },
  itemName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  itemDesc: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteText: { color: colors.error, fontSize: typography.sm, fontWeight: typography.medium },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },

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

  questionCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qTypePill: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  qTypeText: { fontSize: typography.xs, color: colors.primary, fontWeight: typography.medium },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse, fontWeight: typography.medium },
  requiredRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  requiredLabel: { fontSize: typography.sm, color: colors.textSecondary },
  unsupportedCard: {
    borderWidth: 1,
    borderColor: colors.warning + '55',
    backgroundColor: colors.warning + '12',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  unsupportedTitle: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.warning,
  },
  unsupportedType: { fontSize: typography.sm, color: colors.text, fontWeight: typography.medium },
  unsupportedText: { fontSize: typography.sm, color: colors.textSecondary },
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
  typeRow: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  typeLabel: { fontSize: typography.base, color: colors.text },
});
