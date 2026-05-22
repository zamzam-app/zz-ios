import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';
import { TaskEventType } from '../types/task';
import type { SerializedTimelineEvent } from '../types/task';

interface TimelineEventGenericProps {
  event: SerializedTimelineEvent;
}

/**
 * Fallback renderer for events without a specialized component.
 * Handles: UPDATED, ASSIGNED, PRIORITY_CHANGED, DUE_DATE_CHANGED,
 * SUBMITTED, RECURRENCE_CREATED, and any unknown types.
 *
 * Renders human-friendly summaries by extracting known data fields.
 */
function TimelineEventGeneric({ event }: TimelineEventGenericProps) {
  const { type, data } = event;

  switch (type) {
    case TaskEventType.UPDATED:
      return <UpdatedEvent data={data} />;
    case TaskEventType.ASSIGNED:
      return <AssignedEvent data={data} />;
    case TaskEventType.PRIORITY_CHANGED:
      return <PriorityChangedEvent data={data} />;
    case TaskEventType.DUE_DATE_CHANGED:
      return <DueDateChangedEvent data={data} />;
    case TaskEventType.SUBMITTED:
      return <SubmittedEvent data={data} />;
    case TaskEventType.RECURRENCE_CREATED:
      return <RecurrenceEvent data={data} />;
    default:
      return <UnknownEvent />;
  }
}

// ─── Sub-renderers ──────────────────────────────────────────────────────────

function UpdatedEvent({ data }: { data: Record<string, unknown> }) {
  const changes = data.changes as Record<string, { from: unknown; to: unknown }> | undefined;

  if (!changes) return null;

  const fieldNames = Object.keys(changes);
  const preview = fieldNames
    .slice(0, 2)
    .map((f) =>
      f
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim(),
    )
    .join(', ');

  return (
    <View style={styles.container}>
      <Text style={styles.body}>
        Updated {preview}
        {fieldNames.length > 2 ? ` and ${fieldNames.length - 2} more` : ''}
      </Text>
    </View>
  );
}

function AssignedEvent({ data }: { data: Record<string, unknown> }) {
  const added = data.added as string[] | undefined;
  const removed = data.removed as string[] | undefined;
  const parts: string[] = [];

  if (added && added.length > 0) {
    parts.push(`+${added.length} assignee${added.length > 1 ? 's' : ''}`);
  }
  if (removed && removed.length > 0) {
    parts.push(`-${removed.length} assignee${removed.length > 1 ? 's' : ''}`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.body}>
        {parts.length > 0 ? `Assignees updated: ${parts.join(', ')}` : 'Assignees updated'}
      </Text>
    </View>
  );
}

function PriorityChangedEvent({ data }: { data: Record<string, unknown> }) {
  const from = data.from as string | undefined;
  const to = data.to as string | undefined;
  return (
    <View style={styles.container}>
      <Text style={styles.body}>
        Priority changed{from ? ` from ${from}` : ''}
        {to ? ` to ${to}` : ''}
      </Text>
    </View>
  );
}

function DueDateChangedEvent({ data }: { data: Record<string, unknown> }) {
  const from = data.from as string | undefined;
  const to = data.to as string | undefined;
  const reason = data.reason as string | undefined;
  const formatDate = (d: string) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString();
    } catch {
      return d;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.body}>
        Due date changed{from ? ` from ${formatDate(from)}` : ''}
        {to ? ` to ${formatDate(to)}` : ''}
      </Text>
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
    </View>
  );
}

function SubmittedEvent({ data }: { data: Record<string, unknown> }) {
  const role = data.role as string | undefined;
  const text = data.text as string | undefined;
  return (
    <View style={styles.container}>
      <Text style={styles.body}>Submitted for review{role ? ` as ${role}` : ''}</Text>
      {text ? (
        <Text style={styles.submissionText} numberOfLines={3}>
          {text}
        </Text>
      ) : null}
    </View>
  );
}

function RecurrenceEvent({ data }: { data: Record<string, unknown> }) {
  const newTaskId = data.newTaskId as string | undefined;
  return (
    <View style={styles.container}>
      <Text style={styles.body}>
        Created recurring instance{newTaskId ? ` (${newTaskId.slice(-6)})` : ''}
      </Text>
    </View>
  );
}

function UnknownEvent() {
  return (
    <View style={styles.container}>
      <Text style={styles.body}>Performed an action</Text>
    </View>
  );
}

export default React.memo(TimelineEventGeneric);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  body: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  reason: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  submissionText: {
    fontSize: typography.xs,
    color: colors.text,
    marginTop: 2,
    lineHeight: typography.xs * 1.4,
  },
});
