import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useReview, useResolveComplaint } from '../../hooks/useReviews';
import { useForm } from '../../hooks/useForms';
import { useAuthStore } from '../../store/authStore';
import { Review, UserResponse } from '../../api/endpoints/reviews';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { ReviewsStackParamList } from '../../navigation/ReviewsNavigator';
import StarRating from '../../components/StarRating';

type Props = NativeStackScreenProps<ReviewsStackParamList, 'ReviewDetail'>;
type ResolvableComplaintStatus = 'resolved' | 'dismissed';

type ComplaintTone = {
  label: string;
  text: string;
  bg: string;
  border: string;
};

function formatDate(iso?: string | null, month: 'short' | 'long' = 'long') {
  if (!iso) return 'Not available';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric' });
}

function toSentenceCase(status: string) {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getComplaintTone(review: Review): ComplaintTone | null {
  if (!review.isComplaint) return null;

  if (review.complaintStatus === 'resolved') {
    return {
      label: 'Resolved',
      text: colors.success,
      bg: '#ECFDF3',
      border: '#D1FAE5',
    };
  }

  if (review.complaintStatus === 'dismissed') {
    return {
      label: 'Dismissed',
      text: '#B91C1C',
      bg: '#FEE2E2',
      border: '#FECACA',
    };
  }

  return {
    label: 'Pending',
    text: '#B45309',
    bg: '#FEF3C7',
    border: '#FDE68A',
  };
}

function Row({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function isLikelyObjectId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value);
}

function ResponseItem({
  response,
  isLast,
  questionTitle,
  questionType,
}: {
  response: UserResponse;
  isLast: boolean;
  questionTitle: string;
  questionType?: string;
}) {

  const renderAnswer = () => {
    const answer = response.answer;
    if (questionType === 'rating' && typeof answer === 'number') {
      return <StarRating rating={answer} size={14} />;
    }
    if (Array.isArray(answer)) {
      return (
        <View style={styles.answerList}>
          {answer.map((a, i) => (
            <Text key={`${questionTitle}-${i}`} style={styles.answerText}>· {a}</Text>
          ))}
        </View>
      );
    }
    return <Text style={styles.answerText}>{String(answer)}</Text>;
  };

  return (
    <View style={[styles.responseItem, isLast && styles.responseItemLast]}>
      <Text style={styles.questionTitle}>{questionTitle}</Text>
      {renderAnswer()}
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number | string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingWrap}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {count !== undefined && count !== null ? <Text style={styles.sectionCount}>{count}</Text> : null}
    </View>
  );
}

export default function ReviewDetailScreen({ route }: Props) {
  const { reviewId } = route.params;
  const { data: review, isLoading } = useReview(reviewId);
  const { data: form } = useForm(review?.formId ?? '');
  const resolveComplaint = useResolveComplaint();
  const user = useAuthStore((s) => s.user);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<ResolvableComplaintStatus | null>(null);

  const canResolve =
    review?.isComplaint
    && (review.complaintStatus === 'pending' || !review.complaintStatus);

  const handleResolve = (status: ResolvableComplaintStatus) => {
    if (!review || !user) return;

    const confirmationTitle = status === 'resolved' ? 'Mark as Resolved' : 'Dismiss Complaint';

    Alert.alert(
      confirmationTitle,
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setPendingAction(status);
            resolveComplaint.mutate(
              {
                reviewId: review.id,
                payload: {
                  complaintStatus: status,
                  resolvedBy: user.id,
                  resolutionNotes: resolutionNotes.trim() || undefined,
                },
              },
              {
                onSettled: () => {
                  setPendingAction(null);
                },
              },
            );
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Review not found</Text>
      </View>
    );
  }

  const complaintTone = getComplaintTone(review);
  const hasResolution = Boolean(review.complaintStatus && review.complaintStatus !== 'pending');
  const isMutationPending = resolveComplaint.isPending;
  const questionById = useMemo(() => {
    const map = new Map<string, { title: string; type?: string }>();
    for (const question of form?.questions ?? []) {
      map.set(question._id, {
        title: question.title,
        type: question.type,
      });
    }
    return map;
  }, [form?.questions]);

  const detailRows: Array<{ label: string; value: string }> = [
    { label: 'Customer', value: review.customerName },
    { label: 'Outlet', value: review.outletName },
    { label: 'Submitted', value: formatDate(review.createdAt) },
    { label: 'Rating', value: `${review.overallRating.toFixed(1)} / 5.0` },
    { label: 'Complaint', value: review.isComplaint ? 'Yes' : 'No' },
  ];

  if (review.complaintStatus) {
    detailRows.push({ label: 'Complaint Status', value: toSentenceCase(review.complaintStatus) });
  }

  const resolutionRows: Array<{ label: string; value: string }> = [
    { label: 'Status', value: toSentenceCase(review.complaintStatus ?? 'pending') },
  ];

  if (review.resolvedAt) {
    resolutionRows.push({ label: 'Resolved At', value: formatDate(review.resolvedAt, 'short') });
  }

  if (review.resolvedBy) {
    resolutionRows.push({ label: 'Resolved By', value: review.resolvedBy });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headingWrap}>
            <Text style={styles.heading}>Review Details</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.topRow}>
            {complaintTone ? (
              <View style={[styles.statusBadge, { backgroundColor: complaintTone.bg, borderColor: complaintTone.border }]}>
                <Text style={[styles.statusBadgeText, { color: complaintTone.text }]}>{complaintTone.label}</Text>
              </View>
            ) : (
              <View style={styles.feedbackBadge}>
                <Text style={styles.feedbackBadgeText}>Feedback</Text>
              </View>
            )}
            <View style={styles.ratingWrap}>
              <StarRating rating={review.overallRating} size={14} />
              <Text style={styles.ratingText}>{review.overallRating.toFixed(1)} / 5.0</Text>
            </View>
          </View>

          <Text style={styles.summaryTitle}>{review.customerName}</Text>
          <Text style={styles.summaryOutlet}>{review.outletName}</Text>
          <Text style={styles.summaryMeta}>Submitted on {formatDate(review.createdAt)}</Text>

          {review.complaintReason ? (
            <Text style={styles.complaintPreview} numberOfLines={3}>{review.complaintReason}</Text>
          ) : null}
        </View>

        <SectionHeader title="Review Details" />
        <View style={styles.card}>
          {detailRows.map((item, index) => (
            <Row
              key={item.label}
              label={item.label}
              value={item.value}
              isLast={index === detailRows.length - 1}
            />
          ))}
        </View>

        {review.userResponses.length > 0 && (
          <>
            <SectionHeader title="Responses" count={review.userResponses.length} />
            <View style={styles.card}>
              {review.userResponses.map((response, index) => {
                const questionRef = typeof response.questionId === 'object' && response.questionId
                  ? response.questionId
                  : null;
                const questionId = typeof response.questionId === 'string'
                  ? response.questionId
                  : questionRef?._id;
                const fallbackQuestion = questionId ? questionById.get(questionId) : undefined;
                const mappedTitle = questionRef?.title?.trim() || fallbackQuestion?.title?.trim();
                const inlineStringQuestion = typeof response.questionId === 'string'
                  && !isLikelyObjectId(response.questionId)
                  ? response.questionId.trim()
                  : '';
                const questionTitle = mappedTitle || inlineStringQuestion || `Question ${index + 1}`;
                const questionType = questionRef?.type ?? fallbackQuestion?.type;

                return (
                  <ResponseItem
                    key={`${index}-${String(response.questionId)}`}
                    response={response}
                    isLast={index === review.userResponses.length - 1}
                    questionTitle={questionTitle}
                    questionType={questionType}
                  />
                );
              })}
            </View>
          </>
        )}

        {review.isComplaint && review.complaintReason && (
          <>
            <SectionHeader title="Complaint" />
            <View style={[styles.card, styles.complaintCard]}>
              <Text style={styles.complaintReason}>{review.complaintReason}</Text>
            </View>
          </>
        )}

        {hasResolution && (
          <>
            <SectionHeader title="Resolution" />
            <View style={styles.card}>
              {resolutionRows.map((item, index) => (
                <Row
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  isLast={index === resolutionRows.length - 1 && !review.resolutionNotes}
                />
              ))}

              {review.resolutionNotes ? (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesValue}>{review.resolutionNotes}</Text>
                </View>
              ) : null}
            </View>
          </>
        )}

        {canResolve && (
          <>
            <SectionHeader title="Resolve Complaint" />
            <View style={styles.card}>
              <TextInput
                style={styles.notesInput}
                placeholder="Resolution notes (optional)..."
                placeholderTextColor={colors.textDisabled}
                multiline
                numberOfLines={4}
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
              />

              <View style={styles.resolveButtonsRow}>
                <TouchableOpacity
                  style={[styles.resolveBtn, isMutationPending && styles.buttonDisabled]}
                  onPress={() => handleResolve('resolved')}
                  disabled={isMutationPending}
                  activeOpacity={0.85}
                >
                  {isMutationPending && pendingAction === 'resolved' ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dismissBtn, isMutationPending && styles.buttonDisabled]}
                  onPress={() => handleResolve('dismissed')}
                  disabled={isMutationPending}
                  activeOpacity={0.85}
                >
                  {isMutationPending && pendingAction === 'dismissed' ? (
                    <ActivityIndicator color={colors.textSecondary} />
                  ) : (
                    <Text style={styles.dismissBtnText}>Dismiss</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headingWrap: {
    flex: 1,
  },
  heading: {
    fontSize: 26,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#D3C5AC40',
    ...shadow.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  feedbackBadge: {
    borderRadius: radius.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  feedbackBadgeText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  ratingWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.bold,
  },
  summaryTitle: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.bold,
    marginBottom: 2,
  },
  summaryOutlet: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: 2,
  },
  summaryMeta: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  complaintPreview: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  sectionHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#EAB308',
  },
  sectionTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#4F4633',
    fontWeight: typography.bold,
  },
  sectionCount: {
    minWidth: 22,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#E6E8EA',
    color: colors.text,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: typography.bold,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },

  responseItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  responseItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  questionTitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  answerList: {
    gap: 4,
  },
  answerText: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 19,
  },

  complaintCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  complaintReason: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },

  notesBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  notesLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  notesValue: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },

  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 94,
    textAlignVertical: 'top',
  },
  resolveButtonsRow: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  resolveBtn: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resolveBtnText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  dismissBtn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary,
    backgroundColor: colors.surface,
  },
  dismissBtnText: {
    color: colors.textSecondary,
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
