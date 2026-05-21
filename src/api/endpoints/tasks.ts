import client from '../client';
import { mapListSafely } from './mapListSafely';
import type {
  SerializedTimelineEvent,
  TaskDetailTimelineResponse,
  EventTypeCounts,
  UnreadTaskCount,
  AggregatedUnread,
  RecentlyViewedTask,
  CreateDelegationPayload,
  CreateReassignmentPayload,
  TaskDelegationRecord,
  ActiveDelegation,
  DelegationEventResponse,
  AddAttachmentPayload,
  TaskAttachment,
  RemoveAttachmentPayload,
  TimelineQuery,
  AttachmentQuery,
  RecentlyViewedQuery,
  PaginatedResponse,
} from '../../types/task';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'OPEN' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskCategory = string;
export type TaskRecurrenceType = 'WEEKLY' | 'MONTHLY';

export interface TaskAttachments {
  images: string[];
  videos: string[];
  audios: string[];
  files: string[];
}

export interface TaskSubmission {
  text?: string;
  attachments?: TaskAttachments;
  createdBy?: { _id: string; name?: string };
  createdAt?: string;
  updatedAt?: string;
}

export type TaskBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface TaskBadge {
  key: string;
  label: string;
  tone: TaskBadgeTone;
}

export interface TaskCategoryOption {
  id: string;
  name: string;
  description?: string;
}

export interface Task {
  id: string;
  description: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  taskCategory?: { _id: string; name: string; description?: string };
  dueDate: string;
  dueTime?: string;
  outletId?: string;
  outletName?: string;
  outlet?: { _id: string; name?: string } | null;
  assigneeIds: string[];
  assigneeNames?: string[];
  assignees?: Array<{ _id: string; name?: string }>;
  imageUrls?: string[];
  attachments?: TaskAttachments;
  adminSubmission?: TaskSubmission;
  managerSubmission?: TaskSubmission;
  isRecurring?: boolean;
  recurrenceType?: TaskRecurrenceType;
  recurrenceDays?: number[];
  assignedAt?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
  badges?: TaskBadge[];
}

export interface TasksQuery {
  page?: number;
  limit?: number;
  outletId?: string;
  status?: TaskStatus;
  taskCategoryId?: string;
  category?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  dueFrom?: string;
  dueTo?: string;
  isRecurring?: boolean;
}

export interface TasksListMeta {
  total: number;
  currentPage: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  limit: number;
}

export interface TasksListResponse {
  data: Task[];
  meta: TasksListMeta;
}

export interface CreateTaskPayload {
  description: string;
  taskCategoryId: string;
  priority: TaskPriority;
  dueDate: string;
  dueTime?: string;
  outletId?: string;
  assigneeIds?: string[];
  status?: TaskStatus;
  isRecurring?: boolean;
  recurrenceType?: TaskRecurrenceType;
  recurrenceDays?: number[];
  adminSubmission?: {
    text?: string;
    attachments?: {
      images?: string[];
      videos?: string[];
      audios?: string[];
      files?: string[];
    };
  };
}

export interface UpdateTaskPayload {
  description?: string;
  taskCategoryId?: string;
  priority?: TaskPriority;
  dueDate?: string;
  dueTime?: string;
  outletId?: string;
  assigneeIds?: string[];
  status?: TaskStatus;
  isRecurring?: boolean;
  recurrenceType?: TaskRecurrenceType;
  recurrenceDays?: number[];
  adminSubmission?: {
    text?: string;
    attachments?: {
      images?: string[];
      videos?: string[];
      audios?: string[];
      files?: string[];
    };
  };
  managerSubmission?: {
    text?: string;
    attachments?: {
      images?: string[];
      videos?: string[];
      audios?: string[];
      files?: string[];
    };
  };
}

// ─── Raw API shape (backend returns nested objects) ───────────────────────────

interface RawTask {
  _id?: string;
  id?: string;
  description?: string;
  category?: string;
  taskCategory?: { _id?: string; name?: string; description?: string };
  priority?: string;
  status?: string;
  dueDate?: string;
  dueTime?: string;
  outletId?: string | { _id?: string; name?: string };
  outlet?: { _id?: string; name?: string };
  outletName?: string;
  assigneeIds?: Array<string | { _id?: string }>;
  assigneeNames?: string[];
  assignees?: Array<{ _id?: string; name?: string }>;
  imageUrls?: string[];
  videoUrls?: string[];
  audioUrls?: string[];
  fileUrls?: string[];
  attachments?: {
    images?: string[];
    videos?: string[];
    audios?: string[];
    files?: string[];
  };
  adminSubmission?: {
    text?: string;
    attachments?: {
      images?: string[];
      videos?: string[];
      audios?: string[];
      files?: string[];
    };
  };
  managerSubmission?: {
    text?: string;
    attachments?: {
      images?: string[];
      videos?: string[];
      audios?: string[];
      files?: string[];
    };
  };
  isRecurring?: boolean;
  recurrenceType?: string;
  recurrenceDays?: number[];
  assignedAt?: string;
  assigned_at?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  completedAt?: string | null;
  badges?: Array<{ key?: string; label?: string; tone?: TaskBadgeTone }>;
}

interface RawTaskCategory {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
}

function mapTaskCategory(raw: RawTaskCategory): TaskCategoryOption {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    description: raw.description,
  };
}

function listFromRaw(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function uniqueList(items: string[]): string[] {
  return Array.from(new Set(items));
}

function mapTask(raw: RawTask): Task {
  const id = String(raw._id ?? raw.id ?? '');
  const description = String(raw.description ?? '');
  const title = description.split('\n')[0]?.trim().slice(0, 120) || 'Task';
  const taskCategory =
    raw.taskCategory?._id && raw.taskCategory?.name
      ? {
        _id: String(raw.taskCategory._id),
        name: String(raw.taskCategory.name),
        description: raw.taskCategory.description,
      }
      : undefined;

  // outlet
  let outletId: string | undefined;
  let outletName: string | undefined;
  if (raw.outlet?._id) {
    outletId = String(raw.outlet._id);
    outletName = raw.outlet.name;
  } else if (typeof raw.outletId === 'object' && raw.outletId?._id) {
    outletId = String(raw.outletId._id);
    outletName = (raw.outletId as { name?: string }).name;
  } else if (typeof raw.outletId === 'string') {
    outletId = raw.outletId;
  }
  if (!outletName && raw.outletName) outletName = raw.outletName;

  // assignees
  let assigneeIds: string[] = [];
  let assigneeNames: string[] = [];
  if (Array.isArray(raw.assignees) && raw.assignees.length > 0) {
    for (const a of raw.assignees) {
      if (a._id) assigneeIds.push(String(a._id));
      if (typeof a.name === 'string') assigneeNames.push(a.name);
    }
  } else {
    assigneeIds = (raw.assigneeIds ?? []).map((x) =>
      typeof x === 'string' ? x : String((x as { _id?: string })._id ?? ''),
    ).filter(Boolean);
    assigneeNames = raw.assigneeNames ?? [];
  }

  const images = uniqueList([
    ...listFromRaw(raw.imageUrls),
    ...listFromRaw(raw.attachments?.images),
    ...listFromRaw(raw.adminSubmission?.attachments?.images),
  ]);
  const videos = uniqueList([
    ...listFromRaw(raw.videoUrls),
    ...listFromRaw(raw.attachments?.videos),
    ...listFromRaw(raw.adminSubmission?.attachments?.videos),
  ]);
  const audios = uniqueList([
    ...listFromRaw(raw.audioUrls),
    ...listFromRaw(raw.attachments?.audios),
    ...listFromRaw(raw.adminSubmission?.attachments?.audios),
  ]);
  const files = uniqueList([
    ...listFromRaw(raw.fileUrls),
    ...listFromRaw(raw.attachments?.files),
    ...listFromRaw(raw.adminSubmission?.attachments?.files),
  ]);
  const hasAttachments = images.length > 0 || videos.length > 0 || audios.length > 0 || files.length > 0;

  const badges = Array.isArray(raw.badges)
    ? raw.badges
        .filter((badge): badge is { key?: string; label?: string; tone?: TaskBadgeTone } => Boolean(badge?.label))
        .map((badge) => ({
          key: String(badge.key ?? badge.label ?? ''),
          label: String(badge.label ?? ''),
          tone: badge.tone ?? 'neutral',
        }))
    : undefined;

  const assignedAt = raw.assignedAt ?? raw.assigned_at ?? raw.createdAt ?? raw.created_at;
  const createdAt = raw.createdAt ?? raw.created_at ?? assignedAt ?? new Date().toISOString();

  return {
    id,
    description,
    title,
    status: (raw.status as TaskStatus) ?? 'OPEN',
    priority: (raw.priority as TaskPriority) ?? 'MEDIUM',
    category: raw.category ?? taskCategory?.name,
    taskCategory,
    dueDate: raw.dueDate ?? new Date().toISOString(),
    dueTime: raw.dueTime,
    outletId,
    outletName,
    outlet: raw.outlet?._id ? { _id: String(raw.outlet._id), name: raw.outlet.name } : null,
    assigneeIds,
    assigneeNames,
    assignees: Array.isArray(raw.assignees)
      ? raw.assignees
        .filter((a): a is { _id?: string; name?: string } => Boolean(a?._id))
        .map((a) => ({ _id: String(a._id), name: a.name }))
      : undefined,
    imageUrls: images.length > 0 ? images : undefined,
    attachments: hasAttachments ? { images, videos, audios, files } : undefined,
    adminSubmission: raw.adminSubmission
      ? {
        text: raw.adminSubmission.text,
        attachments: raw.adminSubmission.attachments
          ? {
            images: listFromRaw(raw.adminSubmission.attachments.images),
            videos: listFromRaw(raw.adminSubmission.attachments.videos),
            audios: listFromRaw(raw.adminSubmission.attachments.audios),
            files: listFromRaw(raw.adminSubmission.attachments.files),
          }
          : undefined,
      }
      : undefined,
    managerSubmission: raw.managerSubmission
      ? {
        text: raw.managerSubmission.text,
        attachments: raw.managerSubmission.attachments
          ? {
            images: listFromRaw(raw.managerSubmission.attachments.images),
            videos: listFromRaw(raw.managerSubmission.attachments.videos),
            audios: listFromRaw(raw.managerSubmission.attachments.audios),
            files: listFromRaw(raw.managerSubmission.attachments.files),
          }
          : undefined,
      }
      : undefined,
    isRecurring: !!raw.isRecurring,
    recurrenceType: raw.recurrenceType as TaskRecurrenceType | undefined,
    recurrenceDays: raw.recurrenceDays ?? [],
    assignedAt,
    createdAt,
    updatedAt: raw.updatedAt,
    completedAt: raw.completedAt ?? null,
    badges,
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const tasksApi = {
  listPaginated: (query?: TasksQuery) =>
    client
      .get<{ data: RawTask[]; meta?: Partial<TasksListMeta> } | RawTask[]>('/tasks', { params: query })
      .then((r): TasksListResponse => {
        const dataRoot = Array.isArray(r.data) ? { data: r.data } : r.data;
        const raw = dataRoot.data ?? [];
        const mapped = mapListSafely(raw, 'tasks', mapTask);
        const fallbackLimit = query?.limit ?? raw.length ?? 0;
        const currentPage = dataRoot.meta?.currentPage ?? query?.page ?? 1;
        const total = dataRoot.meta?.total ?? mapped.length;
        return {
          data: mapped,
          meta: {
            total,
            currentPage,
            hasPrevPage: dataRoot.meta?.hasPrevPage ?? currentPage > 1,
            hasNextPage: dataRoot.meta?.hasNextPage ?? currentPage * fallbackLimit < total,
            limit: dataRoot.meta?.limit ?? fallbackLimit,
          },
        };
      }),

  list: (query?: TasksQuery) =>
    tasksApi.listPaginated(query).then((r) => r.data),

  getById: (id: string) =>
    client.get<RawTask>(`/tasks/${id}`).then((r) => mapTask(r.data)),

  create: (payload: CreateTaskPayload) =>
    client.post<RawTask>('/tasks', payload).then((r) => mapTask(r.data)),

  update: (id: string, payload: UpdateTaskPayload) =>
    client.patch<RawTask>(`/tasks/${id}`, payload).then((r) => mapTask(r.data)),

  listCategories: async () => {
    const response = await client.get<{ data: RawTaskCategory[] } | RawTaskCategory[]>('/task-category', {
      params: { limit: 100 },
    });
    const raw = Array.isArray(response.data)
      ? response.data
      : (response.data as { data: RawTaskCategory[] }).data ?? [];
    return mapListSafely(raw, 'task-categories', mapTaskCategory)
      .filter((category) => category.id.length > 0 && category.name.length > 0);
  },

  createCategory: (payload: { name: string; description: string }) =>
    client.post<RawTaskCategory>('/task-category', payload).then((r) => mapTaskCategory(r.data)),

  updateCategory: (id: string, payload: { name?: string; description?: string }) =>
    client.patch<RawTaskCategory>(`/task-category/${id}`, payload).then((r) => mapTaskCategory(r.data)),

  deleteCategory: (id: string) => client.delete(`/task-category/${id}`),

  updateStatus: (id: string, status: TaskStatus) =>
    client.patch<RawTask>(`/tasks/${id}/status`, { status }).then((r) => mapTask(r.data)),

  delete: (id: string) =>
    client.delete(`/tasks/${id}`),

  // ─── Thread / Detail ──────────────────────────────────────────────────────

  getTaskDetail: (id: string, initialTimelineLimit?: number) =>
    client
      .get<TaskDetailTimelineResponse>(`/tasks/${id}/detail`, {
        params: initialTimelineLimit ? { limit: initialTimelineLimit } : undefined,
      })
      .then((r) => r.data),

  getTimeline: (id: string, query?: TimelineQuery) =>
    client
      .get<PaginatedResponse<SerializedTimelineEvent>>(`/tasks/${id}/timeline`, {
        params: query,
      })
      .then((r) => r.data),

  getEventTypeCounts: (id: string) =>
    client
      .get<EventTypeCounts>(`/tasks/${id}/events/type-counts`)
      .then((r) => r.data),

  // ─── View Tracking ────────────────────────────────────────────────────────

  markTaskViewed: (id: string) =>
    client.post<void>(`/tasks/${id}/view`).then(() => undefined),

  markMultipleTasksViewed: (taskIds: string[]) =>
    client.post<void>('/tasks/view-all', { taskIds }).then(() => undefined),

  // ─── Unread ───────────────────────────────────────────────────────────────

  getUnreadCount: (limit?: number) =>
    client
      .get<UnreadTaskCount[]>('/tasks/unread-count', {
        params: limit ? { limit } : undefined,
      })
      .then((r) => r.data),

  getUnreadAggregated: () =>
    client
      .get<AggregatedUnread>('/tasks/unread-aggregated')
      .then((r) => r.data),

  getUnreadIds: () =>
    client
      .get<string[]>('/tasks/unread-ids')
      .then((r) => r.data),

  getRecentlyViewed: (query?: RecentlyViewedQuery) =>
    client
      .get<PaginatedResponse<RecentlyViewedTask>>('/tasks/recently-viewed', {
        params: query,
      })
      .then((r) => r.data),

  // ─── Delegation ───────────────────────────────────────────────────────────

  delegateTask: (id: string, payload: CreateDelegationPayload) =>
    client
      .post<DelegationEventResponse>(`/tasks/${id}/delegate`, payload)
      .then((r) => r.data),

  reassignTask: (id: string, payload: CreateReassignmentPayload) =>
    client
      .post<DelegationEventResponse>(`/tasks/${id}/reassign`, payload)
      .then((r) => r.data),

  clearDelegation: (id: string) =>
    client
      .delete<DelegationEventResponse>(`/tasks/${id}/delegation`)
      .then((r) => r.data),

  getDelegationHistory: (id: string, query?: { limit?: number; skip?: number }) =>
    client
      .get<TaskDelegationRecord[]>(`/tasks/${id}/delegations`, {
        params: query,
      })
      .then((r) => r.data),

  getDelegatedToMe: () =>
    client
      .get<ActiveDelegation[]>('/tasks/delegated-to-me')
      .then((r) => r.data),

  getMyDelegations: () =>
    client
      .get<ActiveDelegation[]>('/tasks/my-delegations')
      .then((r) => r.data),

  // ─── Attachments ──────────────────────────────────────────────────────────

  addAttachments: (taskId: string, payload: AddAttachmentPayload) =>
    client
      .post<TaskAttachment[]>(`/tasks/${taskId}/attachments`, payload)
      .then((r) => r.data),

  removeAttachment: (taskId: string, attachmentId: string, payload?: RemoveAttachmentPayload) =>
    client
      .delete<void>(`/tasks/${taskId}/attachments/${attachmentId}`, {
        data: payload,
      })
      .then(() => undefined),

  getAttachments: (taskId: string, query?: AttachmentQuery) =>
    client
      .get<PaginatedResponse<TaskAttachment>>(`/tasks/${taskId}/attachments`, {
        params: query,
      })
      .then((r) => r.data),

  addComment: (taskId: string, payload: { text: string; attachmentIds?: string[] }) =>
    client
      .post<any>(`/tasks/${taskId}/comment`, payload)
      .then((r) => r.data),
};
