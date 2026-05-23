import { colors } from '../../../../theme/theme';
import { TaskEventType } from '../../../../types/task';

// ─── Event Type Color Mapping ───────────────────────────────────────────────

export interface EventColors {
  /** Background color of the icon node circle */
  nodeBg: string;
  /** Text/icon color inside the node */
  nodeFg: string;
  /** Accent color for event-specific highlights */
  accent: string;
  /** Label text describing the action */
  actionLabel: string;
}

/** Human-readable action label for each event type */
export function eventActionLabel(type: TaskEventType): string {
  switch (type) {
    case TaskEventType.CREATED:
      return 'created task';
    case TaskEventType.UPDATED:
      return 'updated task';
    case TaskEventType.STATUS_CHANGED:
      return 'changed status';
    case TaskEventType.COMPLETED:
      return 'completed task';
    case TaskEventType.REOPENED:
      return 'reopened task';
    case TaskEventType.PRIORITY_CHANGED:
      return 'changed priority';
    case TaskEventType.DUE_DATE_CHANGED:
      return 'changed due date';
    case TaskEventType.ASSIGNED:
      return 'updated assignees';
    case TaskEventType.REASSIGNED:
      return 'reassigned';
    case TaskEventType.COMMENTED:
      return 'commented';
    case TaskEventType.ATTACHMENT_ADDED:
      return 'added attachment';
    case TaskEventType.ATTACHMENT_REMOVED:
      return 'removed attachment';
    case TaskEventType.SUBMITTED:
      return 'submitted';
    case TaskEventType.RECURRENCE_CREATED:
      return 'created recurring task';
    default:
      return 'performed action';
  }
}

export function eventColors(type: TaskEventType): EventColors {
  switch (type) {
    case TaskEventType.CREATED:
    case TaskEventType.RECURRENCE_CREATED:
      return {
        nodeBg: '#E0F2FE',
        nodeFg: colors.info,
        accent: colors.info,
        actionLabel: eventActionLabel(type),
      };
    case TaskEventType.COMMENTED:
      return {
        nodeBg: '#F3E8FF',
        nodeFg: '#7C3AED',
        accent: '#7C3AED',
        actionLabel: 'commented',
      };
    case TaskEventType.COMPLETED:
    case TaskEventType.REOPENED:
      return {
        nodeBg: '#DCFCE7',
        nodeFg: colors.success,
        accent: colors.success,
        actionLabel: eventActionLabel(type),
      };
    case TaskEventType.REASSIGNED:
      return {
        nodeBg: '#FEF3C7',
        nodeFg: colors.warning,
        accent: colors.warning,
        actionLabel: eventActionLabel(type),
      };
    case TaskEventType.ATTACHMENT_ADDED:
      return {
        nodeBg: '#E0F2FE',
        nodeFg: colors.info,
        accent: '#0369A1',
        actionLabel: 'added attachment',
      };
    case TaskEventType.ATTACHMENT_REMOVED:
      return {
        nodeBg: '#FEE2E2',
        nodeFg: colors.error,
        accent: colors.error,
        actionLabel: 'removed attachment',
      };
    case TaskEventType.SUBMITTED:
      return {
        nodeBg: '#DCFCE7',
        nodeFg: colors.success,
        accent: colors.success,
        actionLabel: 'submitted',
      };
    default:
      return {
        nodeBg: '#F1F5F9',
        nodeFg: colors.textSecondary,
        accent: colors.textSecondary,
        actionLabel: eventActionLabel(type),
      };
  }
}
