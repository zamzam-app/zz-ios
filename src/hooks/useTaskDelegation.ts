import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api/endpoints/tasks';
import type {
  CreateDelegationPayload,
  CreateReassignmentPayload,
  TaskDelegationRecord,
  ActiveDelegation,
  DelegationEventResponse,
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
    onSuccess: (_data, { taskId }) => {
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
    onSuccess: (_data, { taskId }) => {
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
    onSuccess: (_data, taskId) => {
      qc.invalidateQueries({ queryKey: ['taskDetail', taskId] });
      qc.invalidateQueries({ queryKey: ['taskTimeline', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['delegation'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
