import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { colors, spacing, radius, typography } from '../../../../theme/theme';
import { AttachmentType } from '../../../../types/task';
import type { AttachmentPreview } from '../../../../types/task';

import TimelineAudioAttachment from './TimelineAudioAttachment';
import { formatFileSize } from './timelineFileFormatters';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TimelineAttachmentPreviewProps {
  attachment: AttachmentPreview;
  interactive?: boolean;
  removed?: boolean;
  size?: number;
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
    <Pressable
      style={[styles.attachmentCard, removed && styles.removedCard]}
      onPress={interactive && onPress ? () => onPress(attachment) : undefined}
      disabled={!interactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !interactive }}
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
        {size != null && <Text style={styles.attachmentSize}>{formatFileSize(size)}</Text>}
      </View>
    </Pressable>
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
    backgroundColor: colors.border,
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
