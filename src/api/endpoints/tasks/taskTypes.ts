// ─── Domain Types ────────────────────────────────────────────────────────────

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
  assignees?: { _id: string; name?: string }[];
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

export interface RawTaskCategory {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
}

export interface RawTask {
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
  assigneeIds?: (string | { _id?: string })[];
  assigneeNames?: string[];
  assignees?: { _id?: string; name?: string }[];
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
  badges?: { key?: string; label?: string; tone?: TaskBadgeTone }[];
}
