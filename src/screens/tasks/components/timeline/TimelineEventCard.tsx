import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../../../theme/theme';
import { TaskEventType } from '../../../../types/task';
import type { SerializedTimelineEvent, AttachmentPreview } from '../../../../types/task';

import { formatRelativeTime } from './timelineDateFormatters';
import TimelineEventAttachment from './TimelineEventAttachment';
import { eventColors } from './timelineEventColorMap';
import TimelineEventComment from './TimelineEventComment';
import TimelineEventCreated from './TimelineEventCreated';
import TimelineEventDelegation from './TimelineEventDelegation';
import TimelineEventGeneric from './TimelineEventGeneric';
import { eventTypeIcon } from './timelineEventIconMap';
import TimelineEventStatus from './TimelineEventStatus';

// ─── Props ──────────────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface TimelineEventCardProps {
  event: SerializedTimelineEvent;
  /** Whether this is the last event in the timeline (no trailing rail) */
  isLast?: boolean;
  /** Called when an attachment preview is tapped */
  onAttachmentPress?: (attachment: AttachmentPreview) => void;
  /** Called when an actor name/avatar is tapped */
  onActorPress?: (userId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

function TimelineEventCard({
  event,
  isLast,
  onAttachmentPress,
  onActorPress,
}: TimelineEventCardProps) {
  const icon = eventTypeIcon(event.type);
  const { nodeBg, nodeFg, actionLabel } = eventColors(event.type);

  /** Render the appropriate event-specific content */
  const renderContent = () => {
    switch (event.type) {
      case TaskEventType.CREATED:
        return <TimelineEventCreated event={event} />;
      case TaskEventType.COMMENTED:
        return <TimelineEventComment event={event} onAttachmentPress={onAttachmentPress} />;
      case TaskEventType.STATUS_CHANGED:
      case TaskEventType.COMPLETED:
      case TaskEventType.REOPENED:
        return <TimelineEventStatus event={event} />;
      case TaskEventType.ATTACHMENT_ADDED:
      case TaskEventType.ATTACHMENT_REMOVED:
        return <TimelineEventAttachment event={event} onAttachmentPress={onAttachmentPress} />;
      case TaskEventType.REASSIGNED:
        return <TimelineEventDelegation event={event} />;
      default:
        return <TimelineEventGeneric event={event} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Timeline Rail + Icon Node */}
      <View style={styles.railColumn}>
        {/* Vertical rail line */}
        {!isLast && <View style={styles.railLine} />}
        {/* Icon node circle (hidden for REASSIGNED — the banner already has its own icon) */}
        {event.type !== TaskEventType.REASSIGNED && (
          <View style={[styles.iconNode, { backgroundColor: nodeBg }]}>
            <Ionicons name={icon as IoniconName} size={14} color={nodeFg} />
          </View>
        )}
      </View>

      {/* Content Card */}
      <View style={styles.contentColumn}>
        {/* Actor + Action + Timestamp row */}
        <View style={styles.headerRow}>
          {event.type === TaskEventType.REASSIGNED ? (
            /* REASSIGNED events show their own detailed banner below — skip redundant header */
            <View style={{ flex: 1 }} />
          ) : (
            <View style={styles.actorInfo}>
              <Text
                style={styles.actorName}
                onPress={onActorPress ? () => onActorPress(event.createdBy._id) : undefined}
              >
                {event.createdBy.name}
              </Text>
              <Text style={styles.actionText}> · {actionLabel}</Text>
            </View>
          )}
          <Text style={styles.timestamp}>{formatRelativeTime(event.createdAt)}</Text>
        </View>

        {/* Event-specific content */}
        {renderContent()}
      </View>
    </View>
  );
}

// ─── Memoization ────────────────────────────────────────────────────────────

export default React.memo(TimelineEventCard);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
  },
  // ── Rail Column ──────────────────────────────────────────────────────────
  railColumn: {
    width: 32,
    alignItems: 'center',
    paddingTop: 4,
  },
  railLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.border,
    left: 15,
  },
  iconNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    // White border to overlap the rail line cleanly
    borderWidth: 2,
    borderColor: colors.surface,
  },
  // ── Content Column ───────────────────────────────────────────────────────
  contentColumn: {
    flex: 1,
    paddingLeft: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  actorName: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  actionText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  timestamp: {
    fontSize: typography.xs,
    color: colors.textDisabled,
    marginLeft: spacing.xs,
  },
});
