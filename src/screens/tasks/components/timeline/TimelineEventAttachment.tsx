import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../../../theme/theme';
import { TaskEventType, AttachmentType } from '../../../../types/task';
import type { SerializedTimelineEvent, AttachmentPreview } from '../../../../types/task';

import TimelineAttachmentPreview from './TimelineAttachmentPreview';

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
            <TimelineAttachmentPreview
              key={att._id}
              attachment={att}
              interactive={isAdded}
              removed={!isAdded}
              size={size}
              onPress={onAttachmentPress}
            />
          ))}
        </View>
      ) : (
        <View style={styles.inlineRow}>
          <Ionicons
            name={(isAdded ? 'attach' : 'trash') as React.ComponentProps<typeof Ionicons>['name']}
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
