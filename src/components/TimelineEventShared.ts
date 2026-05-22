import { TaskEventType } from '../types/task';
import { colors } from '../theme/theme';

// ─── Event Type Icon Mapping ────────────────────────────────────────────────

/** Ionicons icon name for each event type */
export function eventTypeIcon(type: TaskEventType): string {
  switch (type) {
    case TaskEventType.CREATED:
      return 'add-circle';
    case TaskEventType.COMMENTED:
      return 'chatbubble-ellipses';
    case TaskEventType.STATUS_CHANGED:
      return 'swap-horizontal';
    case TaskEventType.COMPLETED:
      return 'checkmark-circle';
    case TaskEventType.REOPENED:
      return 'refresh';
    case TaskEventType.PRIORITY_CHANGED:
      return 'flag';
    case TaskEventType.DUE_DATE_CHANGED:
      return 'calendar';
    case TaskEventType.ASSIGNED:
      return 'person-add';
    case TaskEventType.REASSIGNED:
      return 'people';
    case TaskEventType.ATTACHMENT_ADDED:
      return 'attach';
    case TaskEventType.ATTACHMENT_REMOVED:
      return 'trash';
    case TaskEventType.SUBMITTED:
      return 'send';
    case TaskEventType.RECURRENCE_CREATED:
      return 'repeat';
    case TaskEventType.UPDATED:
      return 'create';
    default:
      return 'ellipse';
  }
}

// ─── Event Type Color Mapping ───────────────────────────────────────────────

interface EventColors {
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

// ─── Time Formatting ────────────────────────────────────────────────────────

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Format an ISO timestamp into a relative time string.
 *
 * Examples: "Just now", "2m ago", "3h ago", "Yesterday", "2d ago", "Jan 15"
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();

  if (Number.isNaN(then)) return isoTimestamp;

  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 0) return 'Just now';
  if (diffSec < MINUTE) return 'Just now';
  if (diffSec < HOUR) {
    const mins = Math.floor(diffSec / MINUTE);
    return `${mins}m ago`;
  }
  if (diffSec < DAY) {
    const hours = Math.floor(diffSec / HOUR);
    return `${hours}h ago`;
  }
  if (diffSec < 2 * DAY) return 'Yesterday';
  if (diffSec < WEEK) {
    const days = Math.floor(diffSec / DAY);
    return `${days}d ago`;
  }

  // Older: show date
  const date = new Date(then);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/**
 * Format an ISO timestamp into a full date-time string.
 * Example: "Oct 24, 2023 · 11:30 AM"
 */
export function formatFullDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return `${month} ${day}, ${year} · ${hour12}:${minutes} ${ampm}`;
}

// ─── File Size Formatting ───────────────────────────────────────────────────

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatFileSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes === 0) return '0 B';

  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`;
}
