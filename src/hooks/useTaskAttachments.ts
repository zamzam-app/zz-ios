import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/endpoints/tasks';
import { cursorPageParam, cursorQueryFn } from '../utils/pagination';
import type {
  AddAttachmentPayload,
  RemoveAttachmentPayload,
  TaskAttachment,
  AttachmentQuery,
  TaskDetailTimelineResponse,
} from '../types/task';

// ─── Attachment Paginated Query ─────────────────────────────────────────────

/**
 * Cursor-paginated list of attachments for a task.
 *
 * Query key: `['taskAttachments', taskId]` or `['taskAttachments', taskId, { type }]`
 * when an attachment-type filter is active.
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } =
 *   useTaskAttachments(taskId, { type: AttachmentType.IMAGE });
 *
 * const attachments = flattenInfiniteData(data);
 * ```
 */
export const useTaskAttachments = (
  taskId: string,
  filters?: { type?: AttachmentQuery['type'] },
  options?: { enabled?: boolean },
) => {
  const typeParam = filters?.type;

  return useInfiniteQuery({
    queryKey: typeParam
      ? ['taskAttachments', taskId, { type: typeParam }]
      : ['taskAttachments', taskId],
    queryFn: cursorQueryFn(
      (cursor: string | undefined) => tasksApi.getAttachments(taskId, { cursor, type: typeParam }),
      undefined as void,
    ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: cursorPageParam<TaskAttachment>(),
    enabled: (options?.enabled ?? true) && !!taskId,
  });
};

// ─── Attachment Mutations ───────────────────────────────────────────────────

/**
 * Register uploaded attachments with a task.
 *
 * Caches and optimistic previews:
 *   - `['taskTimeline', taskId]` — new ATTACHMENT_ADDED event will appear
 *   - `['taskAttachments', taskId]` — new attachments in list
 *   - `['taskDetail', taskId]` — threadStats.attachmentCount increments
 *
 * @example
 * ```ts
 * const { mutate: addAttachments } = useAddAttachments();
 * addAttachments({
 *   taskId,
 *   payload: {
 *     files: [{ url: cloudinaryUrl, type: AttachmentType.IMAGE, size: 12345 }],
 *   },
 * });
 * ```
 */
export const useAddAttachments = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: AddAttachmentPayload }) =>
      tasksApi.addAttachments(taskId, payload),

    onMutate: async ({ taskId, payload }) => {
      await qc.cancelQueries({ queryKey: ['taskDetail', taskId] });
      await qc.cancelQueries({ queryKey: ['taskAttachments', taskId] });

      const previousDetail = qc.getQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId]);

      if (previousDetail) {
        const fileCount = payload.files.length;
        qc.setQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId], {
          ...previousDetail,
          summary: {
            ...previousDetail.summary,
            threadStats: {
              ...previousDetail.summary.threadStats,
              attachmentCount: previousDetail.summary.threadStats.attachmentCount + fileCount,
            },
          },
        });
      }

      return { previousDetail };
    },

    onError: (_err, { taskId }, context) => {
      if (context?.previousDetail) {
        qc.setQueryData(['taskDetail', taskId], context.previousDetail);
      }
    },

    onSettled: (_data, _error, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['taskTimeline', taskId] });
      qc.invalidateQueries({ queryKey: ['taskAttachments', taskId] });
      qc.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

/**
 * Soft-delete an attachment from a task.
 *
 * @example
 * ```ts
 * const { mutate: removeAttachment } = useRemoveAttachment();
 * removeAttachment({
 *   taskId: 'abc',
 *   attachmentId: 'xyz',
 *   payload: { reason: 'Wrong file uploaded' },
 * });
 * ```
 */
export const useRemoveAttachment = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      attachmentId,
      payload,
    }: {
      taskId: string;
      attachmentId: string;
      payload?: RemoveAttachmentPayload;
    }) => tasksApi.removeAttachment(taskId, attachmentId, payload),

    onMutate: async ({ taskId, attachmentId }) => {
      await qc.cancelQueries({ queryKey: ['taskDetail', taskId] });
      await qc.cancelQueries({ queryKey: ['taskAttachments', taskId] });

      const previousDetail = qc.getQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId]);

      if (previousDetail) {
        qc.setQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId], {
          ...previousDetail,
          summary: {
            ...previousDetail.summary,
            threadStats: {
              ...previousDetail.summary.threadStats,
              attachmentCount: Math.max(0, previousDetail.summary.threadStats.attachmentCount - 1),
            },
          },
        });
      }

      return { previousDetail };
    },

    onError: (_err, { taskId }, context) => {
      if (context?.previousDetail) {
        qc.setQueryData(['taskDetail', taskId], context.previousDetail);
      }
    },

    onSettled: (_data, _error, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['taskTimeline', taskId] });
      qc.invalidateQueries({ queryKey: ['taskAttachments', taskId] });
      qc.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

/**
 * Add a comment to a task thread.
 * Invalidates ['taskTimeline', taskId] so the new COMMENTED event shows up.
 */
export const useAddComment = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: { text: string; attachmentIds?: string[] };
    }) => tasksApi.addComment(taskId, payload),

    onSettled: (_data, _error, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['taskTimeline', taskId] });
      qc.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};
