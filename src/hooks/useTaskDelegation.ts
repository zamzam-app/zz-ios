import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/endpoints/tasks';
import type {
  Actor,
  CreateDelegationPayload,
  CreateReassignmentPayload,
  TaskDelegationRecord,
  ActiveDelegation,
  TaskDetailTimelineResponse,
} from '../types/task';

// ─── Delegation Queries ─────────────────────────────────────────────────────

/**
 * Fetch delegation history for a specific task.
 *
 * Query key: `['delegation', 'history', taskId]`
 */
export const useDelegationHistory = (
  taskId: string,
  query?: { limit?: number; skip?: number },
  options?: { enabled?: boolean },
) =>
  useQuery<TaskDelegationRecord[]>({
    queryKey: ['delegation', 'history', taskId, query],
    queryFn: () => tasksApi.getDelegationHistory(taskId, query),
    enabled: (options?.enabled ?? true) && !!taskId,
  });

/**
 * Fetch tasks currently delegated to the current user.
 *
 * Query key: `['delegation', 'delegatedToMe']`
 */
export const useDelegatedToMe = (options?: { enabled?: boolean }) =>
  useQuery<ActiveDelegation[]>({
    queryKey: ['delegation', 'delegatedToMe'],
    queryFn: tasksApi.getDelegatedToMe,
    enabled: options?.enabled ?? true,
  });

/**
 * Fetch delegations created by the current user.
 *
 * Query key: `['delegation', 'myDelegations']`
 */
export const useMyDelegations = (options?: { enabled?: boolean }) =>
  useQuery<ActiveDelegation[]>({
    queryKey: ['delegation', 'myDelegations'],
    queryFn: tasksApi.getMyDelegations,
    enabled: options?.enabled ?? true,
  });

// ─── Delegation Mutations ───────────────────────────────────────────────────

/**
 * Delegate a task to another user (temporary hand-off).
 *
 * Effects:
 *   - Sets `task.activeOwner` → delegated user
 *   - Sets `task.activeDelegation` sub-document
 *   - Creates `TaskDelegation` audit record
 *   - Emits `REASSIGNED` event
 *
 * Cache invalidation:
 *   - `['taskDetail', taskId]` — owner/delegation changed
 *   - `['taskTimeline', taskId]` — new REASSIGNED event
 *   - `['delegation']` — delegation lists changed
 *   - `['task', taskId]`
 */
export const useDelegateTask = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: CreateDelegationPayload;
    }) => tasksApi.delegateTask(taskId, payload),

    onMutate: async ({ taskId, payload }) => {
      await qc.cancelQueries({ queryKey: ['taskDetail', taskId] });
      await qc.cancelQueries({ queryKey: ['task', taskId] });

      const previousDetail = qc.getQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId]);

      // Try to look up the delegated user's name from the users cache
      const users = qc.getQueryData<Actor[]>(['users']);
      const delegatedUser = users?.find((u) => u._id === payload.delegatedTo);
      const delegatedToActor: Actor = delegatedUser ?? { _id: payload.delegatedTo, name: 'Delegated User' };

      if (previousDetail) {
        qc.setQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId], {
          ...previousDetail,
          summary: {
            ...previousDetail.summary,
            activeOwner: delegatedToActor,
            activeDelegation: {
              delegatedTo: delegatedToActor,
              // delegatedBy stays as whatever it was (we don't have current user's Actor from cache)
              delegatedBy: previousDetail.summary.activeOwner ?? delegatedToActor,
              delegatedAt: new Date().toISOString(),
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
      qc.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      qc.invalidateQueries({ queryKey: ['taskTimeline', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['delegation'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

/**
 * Reassign a task to another user permanently.
 *
 * Effects:
 *   - Sets `task.activeOwner` → new owner
 *   - Clears any existing `activeDelegation`
 *   - Emits `REASSIGNED` event
 *
 * Cache invalidation:
 *   - Same as delegateTask
 */
export const useReassignTask = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      payload,
    }: {
      taskId: string;
      payload: CreateReassignmentPayload;
    }) => tasksApi.reassignTask(taskId, payload),

    onMutate: async ({ taskId, payload }) => {
      await qc.cancelQueries({ queryKey: ['taskDetail', taskId] });
      await qc.cancelQueries({ queryKey: ['task', taskId] });

      const previousDetail = qc.getQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId]);

      // Try to look up the new owner's name from the users cache
      const users = qc.getQueryData<Actor[]>(['users']);
      const newOwner = users?.find((u) => u._id === payload.newOwnerId);
      const newOwnerActor: Actor = newOwner ?? { _id: payload.newOwnerId, name: 'New Owner' };

      if (previousDetail) {
        qc.setQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId], {
          ...previousDetail,
          summary: {
            ...previousDetail.summary,
            activeOwner: newOwnerActor,
            activeDelegation: null,
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
      qc.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      qc.invalidateQueries({ queryKey: ['taskTimeline', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['delegation'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

/**
 * Clear an active delegation, restoring ownership to the original owner.
 *
 * Effects:
 *   - Clears `activeDelegation` sub-document
 *   - Restores `activeOwner` to the original owner
 *   - Emits `REASSIGNED` event with `revokeDelegation: true`
 *
 * Cache invalidation:
 *   - Same as delegateTask
 */
export const useClearDelegation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => tasksApi.clearDelegation(taskId),

    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['taskDetail', taskId] });
      await qc.cancelQueries({ queryKey: ['task', taskId] });

      const previousDetail = qc.getQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId]);

      if (previousDetail?.summary.activeDelegation) {
        // Restore owner to the original (delegatedBy)
        const originalOwner = previousDetail.summary.activeDelegation.delegatedBy;

        qc.setQueryData<TaskDetailTimelineResponse>(['taskDetail', taskId], {
          ...previousDetail,
          summary: {
            ...previousDetail.summary,
            activeOwner: originalOwner,
            activeDelegation: null,
          },
        });
      }

      return { previousDetail };
    },

    onError: (_err, taskId, context) => {
      if (context?.previousDetail) {
        qc.setQueryData(['taskDetail', taskId], context.previousDetail);
      }
    },

    onSettled: (_data, _error, taskId) => {
      qc.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      qc.invalidateQueries({ queryKey: ['taskTimeline', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['delegation'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
