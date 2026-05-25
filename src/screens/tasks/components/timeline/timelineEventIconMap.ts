import { TaskEventType } from '../../../../types/task';

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
