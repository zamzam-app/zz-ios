// ─── Enums ─────────────────────────────────────────────────────────────────

export enum TaskEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  COMPLETED = 'COMPLETED',
  REOPENED = 'REOPENED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  DUE_DATE_CHANGED = 'DUE_DATE_CHANGED',
  ASSIGNED = 'ASSIGNED',
  REASSIGNED = 'REASSIGNED',
  COMMENTED = 'COMMENTED',
  ATTACHMENT_ADDED = 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED',
  SUBMITTED = 'SUBMITTED',
  RECURRENCE_CREATED = 'RECURRENCE_CREATED',
}

export enum AttachmentType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  DOCUMENT = 'DOCUMENT',
}

// ─── Core Data Types ────────────────────────────────────────────────────────

export interface Actor {
  _id: string;
  name: string;
  avatar?: string;
}

export interface AttachmentPreview {
  _id: string;
  type: AttachmentType;
  url: string;
}

export interface DelegationSummary {
  delegatedTo: Actor;
  delegatedBy: Actor;
}

export interface SerializedTimelineEvent {
  _id: string;
  type: TaskEventType;
  data: Record<string, unknown>;
  createdBy: Actor;
  sortKey: string;
  createdAt: string;
  attachmentPreviews?: AttachmentPreview[];
  delegationSummary?: DelegationSummary;
}

export interface TaskSummary {
  _id: string;
  description: string;
  status: 'OPEN' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  dueDate: string;
  dueTime: string;
  activeOwner?: Actor;
  activeDelegation?: {
    delegatedTo: Actor;
    delegatedBy: Actor;
    delegatedAt: string;
  } | null;
  threadStats: {
    eventCount: number;
    attachmentCount: number;
    lastEventAt: string;
  };
  lastEvent?: {
    type: TaskEventType;
    by: string;
    at: string;
  };
  unreadCount: number;
  createdAt: string;
  assigneeIds: string[];
  createdBy: string;
  outletId: string | null;
  taskCategoryId: string;
}

// ─── Pagination Types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface TimelineCursor {
  sortKey: string;
}

// ─── Response Types ─────────────────────────────────────────────────────────

export interface TaskDetailTimelineResponse {
  summary: TaskSummary;
  timeline: PaginatedResponse<SerializedTimelineEvent>;
}

export interface EventTypeCounts {
  [key: string]: number;
}

// ─── View / Unread Types ────────────────────────────────────────────────────

export interface UnreadTaskCount {
  taskId: string;
  unreadCount: number;
}

export interface AggregatedUnread {
  totalUnread: number;
  taskCount: number;
}

export interface RecentlyViewedTask {
  lastViewedAt: string;
  task: {
    _id: string;
    description: string;
    status: 'OPEN' | 'COMPLETED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate: string;
    dueTime: string;
    unreadCount: number;
  };
}

export interface MarkMultipleViewedPayload {
  taskIds: string[];
}

// ─── Delegation Types ───────────────────────────────────────────────────────

export interface CreateDelegationPayload {
  delegatedTo: string;
  note?: string;
}

export interface CreateReassignmentPayload {
  newOwnerId: string;
  reason?: string;
}

export interface TaskDelegationRecord {
  _id: string;
  taskId: string;
  delegatedBy: string;
  delegatedTo: string;
  note?: string;
  createdAt: string;
  delegatedByName?: string;
  delegatedToName?: string;
}

export interface ActiveDelegation {
  taskId: string;
  delegatedBy: string;
  delegatedAt: string;
}

export interface DelegationEventResponse {
  event: SerializedTimelineEvent;
  task: TaskSummary;
}

// ─── Attachment Types ───────────────────────────────────────────────────────

export interface AddAttachmentFile {
  url: string;
  type: AttachmentType;
  size?: number;
  mimeType?: string;
}

export interface AddAttachmentPayload {
  files: AddAttachmentFile[];
}

export interface TaskAttachment {
  _id: string;
  type: AttachmentType;
  url: string;
  uploadedBy: Actor;
  size?: number;
  mimeType?: string;
  createdAt: string;
}

export interface RemoveAttachmentPayload {
  reason?: string;
}

// ─── Query Param Types ──────────────────────────────────────────────────────

export interface TimelineQuery {
  cursor?: string;
  limit?: number;
  types?: TaskEventType[];
}

export interface RecentlyViewedQuery {
  cursor?: string;
  limit?: number;
}

export interface DelegationHistoryQuery {
  limit?: number;
  skip?: number;
}

export interface AttachmentQuery {
  cursor?: string;
  limit?: number;
  type?: AttachmentType;
}
