import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { tasksApi } from '../../api/endpoints/tasks';
import type {
  AddAttachmentPayload,
  RemoveAttachmentPayload,
  TaskAttachment,
  AttachmentQuery,
  TaskDetailTimelineResponse,
} from '../../types/task';
import { cursorPageParam, cursorQueryFn } from '../../utils/pagination';

// ─── Attachment Paginated Query ─────────────────────────────────────────────

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

    onMutate: async ({ taskId }) => {
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
