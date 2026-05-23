// ─── Domain Types (defined in taskTypes.ts) ──────────────────────────────────

export type {
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TaskRecurrenceType,
  TaskAttachments,
  TaskSubmission,
  TaskBadgeTone,
  TaskBadge,
  TaskCategoryOption,
  Task,
  TasksQuery,
  TasksListMeta,
  TasksListResponse,
  CreateTaskPayload,
  UpdateTaskPayload,
} from './taskTypes';

// ─── Tasks API ───────────────────────────────────────────────────────────────

import * as attachment from './taskAttachmentApi';
import * as category from './taskCategoryApi';
import * as crud from './taskCrudApi';
import * as delegation from './taskDelegationApi';
import * as timeline from './taskTimelineApi';
import * as unread from './taskUnreadApi';

export const tasksApi = {
  // ── CRUD ──
  listPaginated: crud.listPaginated,
  list: crud.list,
  getById: crud.getById,
  create: crud.create,
  update: crud.update,
  updateStatus: crud.updateStatus,
  delete: crud.remove,

  // ── Categories ──
  listCategories: category.listCategories,
  createCategory: category.createCategory,
  updateCategory: category.updateCategory,
  deleteCategory: category.deleteCategory,

  // ── Timeline / Detail ──
  getTaskDetail: timeline.getTaskDetail,
  getTimeline: timeline.getTimeline,
  getEventTypeCounts: timeline.getEventTypeCounts,

  // ── View Tracking ──
  markTaskViewed: unread.markTaskViewed,
  markMultipleTasksViewed: unread.markMultipleTasksViewed,

  // ── Unread ──
  getUnreadCount: unread.getUnreadCount,
  getUnreadAggregated: unread.getUnreadAggregated,
  getUnreadIds: unread.getUnreadIds,
  getRecentlyViewed: unread.getRecentlyViewed,

  // ── Delegation ──
  delegateTask: delegation.delegateTask,
  reassignTask: delegation.reassignTask,
  clearDelegation: delegation.clearDelegation,
  getDelegationHistory: delegation.getDelegationHistory,
  getDelegatedToMe: delegation.getDelegatedToMe,
  getMyDelegations: delegation.getMyDelegations,

  // ── Attachments ──
  addAttachments: attachment.addAttachments,
  removeAttachment: attachment.removeAttachment,
  getAttachments: attachment.getAttachments,
  addComment: attachment.addComment,
};

// ─── Task Submission Queue ───────────────────────────────────────────────────

export {
  enqueueTaskSubmission,
  getTaskQueueStatus,
  retryFailedJobs,
  clearFailedJobs,
  clearAllPendingJobs,
} from './taskSubmissionQueueApi';
export type { TaskSubmissionJob } from './taskSubmissionQueueStore';
