import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../../../theme/theme';
import type { SerializedTimelineEvent, AttachmentPreview } from '../../../../types/task';

import TimelineAttachmentPreview from './TimelineAttachmentPreview';

interface TimelineEventCreatedProps {
  event: SerializedTimelineEvent;
  onAttachmentPress?: (attachment: AttachmentPreview) => void;
}

function TimelineEventCreated({ event, onAttachmentPress }: TimelineEventCreatedProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.description} numberOfLines={3}>
        {event.data.description as string}
      </Text>
      {event.attachmentPreviews && event.attachmentPreviews.length > 0 && (
        <View style={styles.attachmentRow}>
          {event.attachmentPreviews.map((att) => (
            <TimelineAttachmentPreview
              key={att._id}
              attachment={att}
              onPress={onAttachmentPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default React.memo(TimelineEventCreated);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  description: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: typography.sm * 1.4,
  },
  attachmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
