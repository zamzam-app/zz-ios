import { useRef, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

import { Question, QuestionType, SupportedQuestion } from '../../../../api/endpoints/forms';
import { useForm, useUpdateForm } from '../../../../hooks/tasks';

export function useFormEditorState(formId: string | null, hideDefaultQuestions: boolean) {
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
    const qTitle = question.title.trim().toLowerCase();
    const isPlaceholderTitle =
      qTitle.length === 0 || /^question\s*\d+$/i.test(qTitle) || qTitle === 'untitled question';
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

  const handleSave = (onSuccess: () => void) => {
    if (!formId || !title.trim()) {
      Alert.alert('Required', 'Form title is required.');
      return;
    }
    updateForm.mutate(
      { id: formId, title: title.trim(), questions },
      {
        onSuccess,
        onError: () => Alert.alert('Error', 'Failed to save form.'),
      },
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

  return {
    form,
    isLoading,
    isUpdating: updateForm.isPending,
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
  };
}
