import type {
  CreateDelegationPayload,
  CreateReassignmentPayload,
  DelegationEventResponse,
  TaskDelegationRecord,
  ActiveDelegation,
} from '../../../types/task';
import client from '../../client';

export function delegateTask(id: string, payload: CreateDelegationPayload) {
  return client.post<DelegationEventResponse>(`/tasks/${id}/delegate`, payload).then((r) => r.data);
}

export function reassignTask(id: string, payload: CreateReassignmentPayload) {
  return client.post<DelegationEventResponse>(`/tasks/${id}/reassign`, payload).then((r) => r.data);
}

export function clearDelegation(id: string) {
  return client.delete<DelegationEventResponse>(`/tasks/${id}/delegation`).then((r) => r.data);
}

export function getDelegationHistory(id: string, query?: { limit?: number; skip?: number }) {
  return client
    .get<TaskDelegationRecord[]>(`/tasks/${id}/delegations`, { params: query })
    .then((r) => r.data);
}

export function getDelegatedToMe() {
  return client.get<ActiveDelegation[]>('/tasks/delegated-to-me').then((r) => r.data);
}

export function getMyDelegations() {
  return client.get<ActiveDelegation[]>('/tasks/my-delegations').then((r) => r.data);
}
