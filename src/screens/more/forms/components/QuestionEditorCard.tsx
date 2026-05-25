import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

import {
  Question,
  QUESTION_TYPE_OPTIONS,
  SupportedQuestion,
} from '../../../../api/endpoints/forms';
import { colors, spacing, radius, typography } from '../../../../theme/theme';

export function QuestionEditorCard({
  question,
  index,
  onUpdate,
  onRemove,
  nextTempId,
}: {
  question: Question;
  index: number;
  onUpdate: (index: number, patch: Partial<Omit<SupportedQuestion, 'type'>>) => void;
  onRemove: (index: number) => void;
  nextTempId: () => number;
}) {
  const getQuestionTypeLabel = (q: Question) => {
    if (q.type === 'unsupported') return `Unsupported (${q.rawType})`;
    return QUESTION_TYPE_OPTIONS.find((option) => option.value === q.type)?.label ?? q.type;
  };

  return (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <View style={styles.qTypePill}>
          <Text style={styles.qTypeText}>{getQuestionTypeLabel(question)}</Text>
        </View>
        {!question.isDefault && (
          <TouchableOpacity onPress={() => onRemove(index)}>
            <Text style={styles.deleteText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
      {question.type === 'unsupported' ? (
        <View style={styles.unsupportedCard}>
          <Text style={styles.unsupportedTitle}>Unsupported question type</Text>
          <Text style={styles.unsupportedType}>{question.rawType}</Text>
          {!!question.title && <Text style={styles.unsupportedText}>Title: {question.title}</Text>}
        </View>
      ) : (
        <>
          <TextInput
            style={[
              styles.input,
              question.isDefault && { opacity: 0.7, backgroundColor: colors.background },
            ]}
            value={question.title}
            editable={!question.isDefault}
            onChangeText={(v) => onUpdate(index, { title: v })}
            placeholder="Question text..."
            placeholderTextColor={colors.textDisabled}
          />
          {(question.type === 'multiple_choice' || question.type === 'checkbox') && (
            <View style={{ gap: spacing.xs }}>
              {(question.options ?? []).map((opt) => (
                <View key={opt._id ?? `${question._id}-${opt.text}`} style={styles.optionRow}>
                  <TextInput
                    style={[
                      styles.input,
                      { flex: 1, marginBottom: 0 },
                      question.isDefault && {
                        opacity: 0.7,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={opt.text}
                    editable={!question.isDefault}
                    onChangeText={(v) => {
                      const newOptions = [...(question.options ?? [])];
                      const targetIndex = newOptions.findIndex((o) => o._id === opt._id);
                      if (targetIndex === -1) return;
                      newOptions[targetIndex] = { ...newOptions[targetIndex], text: v };
                      onUpdate(index, { options: newOptions });
                    }}
                    placeholder="Option..."
                    placeholderTextColor={colors.textDisabled}
                  />
                  {!question.isDefault && (
                    <TouchableOpacity
                      onPress={() => {
                        const newOptions = (question.options ?? []).filter(
                          (o) => o._id !== opt._id,
                        );
                        onUpdate(index, { options: newOptions });
                      }}
                    >
                      <Text style={styles.deleteText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {!question.isDefault && (
                <TouchableOpacity
                  onPress={() =>
                    onUpdate(index, {
                      options: [
                        ...(question.options ?? []),
                        { _id: `temp_opt_${question._id}_${nextTempId()}`, text: '' },
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
          {question.type === 'rating' && (
            <View style={styles.ratingRow}>
              <Text style={styles.label}>Max stars:</Text>
              {[3, 5, 10].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.chip,
                    question.maxRatings === n && styles.chipActive,
                    question.isDefault && { opacity: 0.7 },
                  ]}
                  disabled={question.isDefault}
                  onPress={() => onUpdate(index, { maxRatings: n })}
                >
                  <Text
                    style={[styles.chipText, question.maxRatings === n && styles.chipTextActive]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.requiredRow}
            disabled={question.isDefault}
            onPress={() => onUpdate(index, { isRequired: !question.isRequired })}
          >
            <View
              style={[
                styles.checkbox,
                question.isRequired && styles.checkboxChecked,
                question.isDefault && { opacity: 0.7 },
              ]}
            >
              {question.isRequired && (
                <Text style={{ color: colors.textInverse, fontSize: 10 }}>✓</Text>
              )}
            </View>
            <Text style={[styles.requiredLabel, question.isDefault && { opacity: 0.7 }]}>
              Required
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  deleteText: { color: colors.error, fontSize: typography.sm, fontWeight: typography.medium },
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
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.text },
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
});
