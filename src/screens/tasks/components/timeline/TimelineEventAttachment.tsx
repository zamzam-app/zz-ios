import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, radius, typography } from '../../../../theme/theme';
import { TaskEventType, AttachmentType } from '../../../../types/task';
import type { SerializedTimelineEvent, AttachmentPreview } from '../../../../types/task';

import { formatFileSize } from './timelineFileFormatters';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TimelineEventAttachmentProps {
  event: SerializedTimelineEvent;
  onAttachmentPress?: (attachment: AttachmentPreview) => void;
}

function TimelineEventAttachment({ event, onAttachmentPress }: TimelineEventAttachmentProps) {
  const isAdded = event.type === TaskEventType.ATTACHMENT_ADDED;
  const type = event.data.type as AttachmentType | undefined;
  const size = event.data.size as number | undefined;
  const mimeType = event.data.mimeType as string | undefined;
  const reason = event.data.reason as string | undefined;

  return (
    <View style={styles.container}>
      {/* Attachment previews from server summary */}
      {event.attachmentPreviews && event.attachmentPreviews.length > 0 ? (
        <View style={styles.attachmentRow}>
          {event.attachmentPreviews.map((att) => (
            <View
              key={att._id}
              style={[styles.attachmentCard, !isAdded && styles.removedCard]}
              onTouchEnd={isAdded && onAttachmentPress ? () => onAttachmentPress(att) : undefined}
            >
              <View style={styles.attachmentIconBg}>
                <Ionicons
                  name={attachmentIcon(att.type) as IoniconName}
                  size={18}
                  color={isAdded ? colors.info : colors.error}
                />
              </View>
              <View style={styles.attachmentInfo}>
                <Text style={styles.attachmentType} numberOfLines={1}>
                  {att.type.toLowerCase()}
                </Text>
                {size != null && <Text style={styles.attachmentSize}>{formatFileSize(size)}</Text>}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.inlineRow}>
          <Ionicons
            name={(isAdded ? 'attach' : 'trash') as IoniconName}
            size={14}
            color={isAdded ? colors.info : colors.error}
          />
          <Text style={styles.inlineText}>
            {isAdded ? 'Added' : 'Removed'} {type?.toLowerCase() ?? 'file'}
            {mimeType ? ` (${mimeType})` : ''}
          </Text>
        </View>
      )}

      {/* Removal reason */}
      {!isAdded && reason ? <Text style={styles.reasonText}>{reason}</Text> : null}
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

export default React.memo(TimelineEventAttachment);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 140,
  },
  removedCard: {
    opacity: 0.6,
    borderColor: colors.errorLight,
  },
  attachmentIconBg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInfo: {
    flexDirection: 'column',
  },
  attachmentType: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
    maxWidth: 100,
  },
  attachmentSize: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  inlineText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  reasonText: {
    fontSize: typography.xs,
    color: colors.error,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
