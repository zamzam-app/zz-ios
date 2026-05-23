import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../../../theme/theme';
import { TaskEventType } from '../../../../types/task';
import type { SerializedTimelineEvent } from '../../../../types/task';

interface TimelineEventStatusProps {
  event: SerializedTimelineEvent;
}

function TimelineEventStatus({ event }: TimelineEventStatusProps) {
  const { type, data } = event;

  if (type === TaskEventType.COMPLETED) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>
          Marked as <Text style={styles.completed}>completed</Text>
        </Text>
        {data.submission ? (
          <Text style={styles.submissionText} numberOfLines={2}>
            Submission: {JSON.stringify(data.submission)}
          </Text>
        ) : null}
      </View>
    );
  }

  if (type === TaskEventType.REOPENED) {
    const reason = data.reason as string | undefined;
    const prevStatus = data.previousStatus as string | undefined;
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Reopened{prevStatus ? ` from ${prevStatus}` : ''}</Text>
        {reason ? <Text style={styles.reasonText}>{reason}</Text> : null}
      </View>
    );
  }

  // STATUS_CHANGED
  const from = data.from as string | undefined;
  const to = data.to as string | undefined;
  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        Changed status{from ? ` from ${from}` : ''}
        {to ? ` → ${to}` : ''}
      </Text>
    </View>
  );
}

export default React.memo(TimelineEventStatus);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  statusText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  completed: {
    color: colors.success,
    fontWeight: typography.semibold,
  },
  submissionText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reasonText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
});
