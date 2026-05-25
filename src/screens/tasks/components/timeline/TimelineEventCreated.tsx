import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../../../theme/theme';
import type { SerializedTimelineEvent } from '../../../../types/task';

interface TimelineEventCreatedProps {
  event: SerializedTimelineEvent;
}

function TimelineEventCreated({ event }: TimelineEventCreatedProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.description} numberOfLines={3}>
        {event.data.description as string}
      </Text>
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
});
