import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, radius, typography } from '../../../../theme/theme';
import { AttachmentType } from '../../../../types/task';
import type { AttachmentPreview } from '../../../../types/task';

import TimelineAudioAttachment from './TimelineAudioAttachment';
import { formatFileSize } from './timelineFileFormatters';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TimelineAttachmentPreviewProps {
  /** The attachment preview to render */
  attachment: AttachmentPreview;
  /**
   * Whether the attachment is interactive:
   * - true: audio renders WhatsApp-style player, card supports touch
   * - false: audio renders as icon card, card is inert
   * @default true
   */
  interactive?: boolean;
  /** Whether the attachment has been removed (dimmed styling) */
  removed?: boolean;
  /** Optional file size in bytes (shown below type label) */
  size?: number;
  /** Called when the card is tapped (only if interactive) */
  onPress?: (attachment: AttachmentPreview) => void;
}

function TimelineAttachmentPreview({
  attachment,
  interactive = true,
  removed = false,
  size,
  onPress,
}: TimelineAttachmentPreviewProps) {
  // Render WhatsApp-style audio player for interactive AUDIO attachments
  if (interactive && attachment.type === AttachmentType.AUDIO) {
    return <TimelineAudioAttachment url={attachment.url} />;
  }

  return (
    <View
      style={[styles.attachmentCard, removed && styles.removedCard]}
      onTouchEnd={interactive && onPress ? () => onPress(attachment) : undefined}
    >
      <View style={styles.attachmentIconBg}>
        <Ionicons
          name={attachmentIcon(attachment.type) as IoniconName}
          size={18}
          color={interactive ? colors.info : colors.error}
        />
      </View>
      <View style={styles.attachmentInfo}>
        <Text style={styles.attachmentType} numberOfLines={1}>
          {attachment.type.toLowerCase()}
        </Text>
        {size != null && (
          <Text style={styles.attachmentSize}>{formatFileSize(size)}</Text>
        )}
      </View>
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

export default React.memo(TimelineAttachmentPreview);

const styles = StyleSheet.create({
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
});
