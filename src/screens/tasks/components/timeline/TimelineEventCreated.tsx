import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, radius, typography } from '../../../../theme/theme';
import type { SerializedTimelineEvent, AttachmentPreview } from '../../../../types/task';

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
            <View
              key={att._id}
              style={styles.attachmentCard}
              onTouchEnd={onAttachmentPress ? () => onAttachmentPress(att) : undefined}
            >
              <Text style={styles.attachmentType} numberOfLines={1}>
                {att.type.toLowerCase()}
              </Text>
            </View>
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
  attachmentCard: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentType: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.text,
  },
});
