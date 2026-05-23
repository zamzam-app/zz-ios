import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Review } from '../../../api/endpoints/reviews';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';

import { ReviewAttachmentBlock } from './ReviewAttachmentBlock';

export function Row({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function ResolutionDetailsSection({
  review,
  resolutionRows,
  openAttachment,
}: {
  review: Review;
  resolutionRows: { label: string; value: string }[];
  openAttachment: (url: string, type?: 'image' | 'video' | 'audio' | 'file') => void;
}) {
  const hasResolution = Boolean(review.complaintStatus && review.complaintStatus !== 'pending');
  if (!hasResolution) return null;

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeadingWrap}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Resolution</Text>
        </View>
      </View>
      <View style={styles.card}>
        {resolutionRows.map((item, index) => (
          <Row
            key={item.label}
            label={item.label}
            value={item.value}
            isLast={
              index === resolutionRows.length - 1 &&
              !review.resolutionNotes &&
              !review.resolutionAttachments
            }
          />
        ))}

        {review.resolutionNotes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesValue}>{review.resolutionNotes}</Text>
          </View>
        ) : null}

        {review.resolutionAttachments && (
          <ReviewAttachmentBlock
            title="Resolution Attachments"
            attachments={review.resolutionAttachments}
            onOpenAttachment={openAttachment}
          />
        )}
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
});
