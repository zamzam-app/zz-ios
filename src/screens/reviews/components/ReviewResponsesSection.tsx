import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { UserResponse } from '../../../api/endpoints/reviews';
import StarRating from '../../../components/shared/StarRating';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';
import { isLikelyObjectId } from '../hooks/useComplaintResolutionState';

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
          {answer.map((a) => (
            <Text key={`${questionTitle}-${String(a)}`} style={styles.answerText}>
              · {a}
            </Text>
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

export function ReviewResponsesSection({
  userResponses,
  questionById,
}: {
  userResponses: UserResponse[];
  questionById: Map<string, { title: string; type?: string }>;
}) {
  if (userResponses.length === 0) return null;

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeadingWrap}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Responses</Text>
        </View>
      </View>
      <View style={styles.responsesCard}>
        {userResponses.map((response, index) => {
          const questionRef =
            typeof response.questionId === 'object' && response.questionId
              ? response.questionId
              : null;
          const questionId =
            typeof response.questionId === 'string' ? response.questionId : questionRef?._id;
          const fallbackQuestion = questionId ? questionById.get(questionId) : undefined;
          const mappedTitle = questionRef?.title?.trim() || fallbackQuestion?.title?.trim();
          const inlineStringQuestion =
            typeof response.questionId === 'string' && !isLikelyObjectId(response.questionId)
              ? response.questionId.trim()
              : '';
          const questionTitle = mappedTitle || inlineStringQuestion || `Question ${index + 1}`;
          const questionType = questionRef?.type ?? fallbackQuestion?.type;

          return (
            <ResponseItem
              key={String(response.questionId)}
              response={response}
              isLast={index === userResponses.length - 1}
              questionTitle={questionTitle}
              questionType={questionType}
            />
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.accentYellow,
  },
  sectionTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accentBrownText,
    fontWeight: typography.bold,
  },
  responsesCard: {
    backgroundColor: colors.surface,
    borderRadius: 36,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha44,
    ...shadow.sm,
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
    fontSize: typography.lg,
    color: colors.text,
    fontWeight: typography.bold,
  },
  answerList: {
    gap: 4,
  },
  answerText: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 19,
  },
});
