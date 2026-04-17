import React, { useState } from 'react';
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
import { useAuthStore } from '../../store/authStore';
import { UserResponse } from '../../api/endpoints/reviews';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { ReviewsStackParamList } from '../../navigation/ReviewsNavigator';
import StarRating from '../../components/StarRating';

type Props = NativeStackScreenProps<ReviewsStackParamList, 'ReviewDetail'>;

function ResponseItem({ response }: { response: UserResponse }) {
  const questionTitle =
    typeof response.questionId === 'object' && response.questionId?.title
      ? response.questionId.title
      : 'Question';

  const questionType =
    typeof response.questionId === 'object' ? response.questionId?.type : undefined;

  const renderAnswer = () => {
    const answer = response.answer;
    if (questionType === 'rating' && typeof answer === 'number') {
      return <StarRating rating={answer} size={14} />;
    }
    if (Array.isArray(answer)) {
      return (
        <View style={{ gap: 4 }}>
          {answer.map((a, i) => (
            <Text key={i} style={styles.answerText}>· {a}</Text>
          ))}
        </View>
      );
    }
    return <Text style={styles.answerText}>{String(answer)}</Text>;
  };

  return (
    <View style={styles.responseItem}>
      <Text style={styles.questionTitle}>{questionTitle}</Text>
      {renderAnswer()}
    </View>
  );
}

export default function ReviewDetailScreen({ route }: Props) {
  const { reviewId } = route.params;
  const { data: review, isLoading } = useReview(reviewId);
  const resolveComplaint = useResolveComplaint();
  const user = useAuthStore((s) => s.user);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const canResolve =
    review?.isComplaint &&
    (review.complaintStatus === 'pending' || !review.complaintStatus);

  const handleResolve = (status: 'resolved' | 'dismissed') => {
    if (!review || !user) return;
    Alert.alert(
      status === 'resolved' ? 'Mark as Resolved' : 'Dismiss Complaint',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            resolveComplaint.mutate({
              reviewId: review.id,
              payload: {
                complaintStatus: status,
                resolvedBy: user.id,
                resolutionNotes: resolutionNotes.trim() || undefined,
              },
            });
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

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header info */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{review.customerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{review.customerName}</Text>
              <Text style={styles.outletName}>{review.outletName}</Text>
              <Text style={styles.date}>
                {new Date(review.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </Text>
            </View>
            <StarRating rating={review.overallRating} size={18} />
          </View>
        </View>

        {/* Responses */}
        {review.userResponses.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Responses</Text>
            <View style={styles.card}>
              {review.userResponses.map((r, i) => (
                <ResponseItem key={i} response={r} />
              ))}
            </View>
          </>
        )}

        {/* Complaint section */}
        {review.isComplaint && review.complaintReason && (
          <>
            <Text style={styles.sectionTitle}>Complaint</Text>
            <View style={[styles.card, styles.complaintCard]}>
              <Text style={styles.complaintReason}>{review.complaintReason}</Text>
            </View>
          </>
        )}

        {/* Resolution info (if already resolved) */}
        {review.complaintStatus && review.complaintStatus !== 'pending' && (
          <>
            <Text style={styles.sectionTitle}>Resolution</Text>
            <View style={styles.card}>
              <View style={styles.resolutionRow}>
                <Text style={styles.rowLabel}>Status</Text>
                <Text style={[
                  styles.rowValue,
                  { color: review.complaintStatus === 'resolved' ? colors.success : colors.textSecondary },
                ]}>
                  {review.complaintStatus.toUpperCase()}
                </Text>
              </View>
              {review.resolvedAt && (
                <View style={styles.resolutionRow}>
                  <Text style={styles.rowLabel}>Resolved At</Text>
                  <Text style={styles.rowValue}>
                    {new Date(review.resolvedAt).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
              )}
              {review.resolutionNotes && (
                <View style={[styles.resolutionRow, { flexDirection: 'column', gap: spacing.xs }]}>
                  <Text style={styles.rowLabel}>Notes</Text>
                  <Text style={styles.rowValue}>{review.resolutionNotes}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Resolve actions */}
        {canResolve && (
          <>
            <Text style={styles.sectionTitle}>Resolve Complaint</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Resolution notes (optional)..."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={3}
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
            />
            <TouchableOpacity
              style={[styles.resolveBtn, resolveComplaint.isPending && { opacity: 0.6 }]}
              onPress={() => handleResolve('resolved')}
              disabled={resolveComplaint.isPending}
            >
              {resolveComplaint.isPending ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dismissBtn, resolveComplaint.isPending && { opacity: 0.6 }]}
              onPress={() => handleResolve('dismissed')}
              disabled={resolveComplaint.isPending}
            >
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: typography.bold, fontSize: typography.md },
  customerName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  outletName: { fontSize: typography.sm, color: colors.primary, marginTop: 2 },
  date: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },

  sectionTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  complaintCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  complaintReason: { fontSize: typography.sm, color: colors.text, lineHeight: 20 },

  responseItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  questionTitle: { fontSize: typography.sm, color: colors.textSecondary },
  answerText: { fontSize: typography.sm, color: colors.text },

  resolutionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: typography.sm, color: colors.textSecondary },
  rowValue: { fontSize: typography.sm, color: colors.text, fontWeight: typography.medium },

  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
    height: 90,
    textAlignVertical: 'top',
  },
  resolveBtn: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  resolveBtnText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },
  dismissBtn: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  dismissBtnText: { color: colors.textSecondary, fontSize: typography.base, fontWeight: typography.medium },
});
