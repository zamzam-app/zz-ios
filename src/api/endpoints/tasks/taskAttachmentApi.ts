import type {
  AddAttachmentPayload,
  TaskAttachment,
  RemoveAttachmentPayload,
  AttachmentQuery,
  PaginatedResponse,
} from '../../../types/task';
import client from '../../client';

export async function addAttachments(taskId: string, payload: AddAttachmentPayload) {
  const r = await client.post<TaskAttachment[]>(`/tasks/${taskId}/attachments`, payload);
  return r.data;
}

export async function removeAttachment(
  taskId: string,
  attachmentId: string,
  payload?: RemoveAttachmentPayload,
) {
  await client.delete<void>(`/tasks/${taskId}/attachments/${attachmentId}`, { data: payload });
  return undefined;
}

export async function getAttachments(taskId: string, query?: AttachmentQuery) {
  const r = await client.get<PaginatedResponse<TaskAttachment>>(`/tasks/${taskId}/attachments`, {
    params: query,
  });
  return r.data;
}

export async function addComment(
  taskId: string,
  payload: { text: string; attachmentIds?: string[] },
) {
  const r = await client.post<unknown>(`/tasks/${taskId}/comment`, payload);
  return r.data;
}
