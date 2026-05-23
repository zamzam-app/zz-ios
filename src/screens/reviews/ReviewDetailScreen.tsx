import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReviewsStackParamList } from '../../navigation/ReviewsNavigator';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import { ComplaintResolutionForm } from './components/ComplaintResolutionForm';
import { ResolutionDetailsSection } from './components/ResolutionDetailsSection';
import { ReviewResponsesSection } from './components/ReviewResponsesSection';
import { ReviewSummaryCard } from './components/ReviewSummaryCard';
import { useComplaintResolutionState } from './hooks/useComplaintResolutionState';

type Props = NativeStackScreenProps<ReviewsStackParamList, 'ReviewDetail'>;

export default function ReviewDetailScreen({ route, navigation }: Props) {
  const state = useComplaintResolutionState(route, navigation);

  const {
    review,
    isLoading,
    questionById,
    isAdmin,
    resolutionNotes,
    setResolutionNotes,
    resolutionAttachments,
    uploadingType,
    showResolveSection,
    resolutionRows,
    isMutationPending,
    hasResolution,
    handleBack,
    pickImage,
    pickVideo,
    pickFile,
    pickVoice,
    handleResolve,
    openAttachment,
    removeAttachmentUrl,
  } = state;

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
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headingWrap}>
            <Text style={styles.heading}>Review Details</Text>
          </View>
        </View>

        <ReviewSummaryCard review={review} isAdmin={isAdmin} />

        {review.isComplaint && review.complaintReason && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingWrap}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Complaint Box</Text>
              </View>
            </View>
            <View style={[styles.card, styles.complaintCard]}>
              <View style={styles.inlineComplaintRow}>
                <Text style={[styles.complaintLabel, styles.complaintLabelCol]}>Complaint:</Text>
                <Text style={styles.complaintReasonInline}>{review.complaintReason}</Text>
              </View>
            </View>
          </>
        )}

        {review.userResponses.length > 0 && (
          <ReviewResponsesSection
            userResponses={review.userResponses}
            questionById={questionById}
          />
        )}

        {showResolveSection && (
          <ComplaintResolutionForm
            resolutionNotes={resolutionNotes}
            setResolutionNotes={setResolutionNotes}
            resolutionAttachments={resolutionAttachments}
            uploadingType={uploadingType}
            pickImage={pickImage}
            pickVideo={pickVideo}
            pickFile={pickFile}
            pickVoice={pickVoice}
            handleResolve={handleResolve}
            isMutationPending={isMutationPending}
            removeAttachmentUrl={removeAttachmentUrl}
          />
        )}

        {hasResolution && (
          <ResolutionDetailsSection
            review={review}
            resolutionRows={resolutionRows}
            openAttachment={openAttachment}
          />
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
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  complaintCard: {
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha44,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  complaintLabel: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  complaintLabelCol: {
    width: 86,
  },
  inlineComplaintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  complaintReasonInline: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
