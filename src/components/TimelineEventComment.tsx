import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme/theme';
import { AttachmentType } from '../types/task';
import type { SerializedTimelineEvent, AttachmentPreview } from '../types/task';

interface TimelineEventCommentProps {
  event: SerializedTimelineEvent;
  onAttachmentPress?: (attachment: AttachmentPreview) => void;
}

function TimelineEventComment({ event, onAttachmentPress }: TimelineEventCommentProps) {
  const text = event.data.text as string | undefined;
  const attachmentIds = event.data.attachmentIds as string[] | undefined;
  const attachments = event.attachmentPreviews ?? [];

  return (
    <View style={styles.container}>
      {text ? <Text style={styles.commentText}>{text}</Text> : null}

      {/* Inline attachment previews */}
      {attachments.length > 0 ? (
        <View style={styles.attachmentRow}>
          {attachments.map((att) => (
            <View
              key={att._id}
              style={styles.attachmentChip}
              onTouchEnd={onAttachmentPress ? () => onAttachmentPress(att) : undefined}
            >
              <Ionicons name={attachmentIcon(att.type) as any} size={14} color={colors.info} />
              <Text style={styles.attachmentLabel} numberOfLines={1}>
                {att.type.toLowerCase()}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function attachmentIcon(type: AttachmentType): string {
  switch (type) {
    case AttachmentType.IMAGE:
      return 'image';
    case AttachmentType.VIDEO:
      return 'videocam';
    case AttachmentType.AUDIO:
      return 'musical-notes';
    case AttachmentType.DOCUMENT:
      return 'document-text';
    case AttachmentType.FILE:
    default:
      return 'document';
  }
}

export default React.memo(TimelineEventComment);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  commentText: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: typography.sm * 1.5,
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  attachmentLabel: {
    fontSize: typography.xs,
    color: colors.info,
    maxWidth: 80,
  },
});
