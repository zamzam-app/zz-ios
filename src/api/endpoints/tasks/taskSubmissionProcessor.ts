import { queryClient } from '../../queryClient';
import { removeUploadJob } from '../uploads/uploadQueueApi';
import { waitForUploadJob } from '../uploads/uploadQueueSubscriptions';

import { create as createTask, update as updateTask } from './taskCrudApi';
import {
  ensureLoaded,
  persistQueue,
  getTaskJobs,
  replaceTaskJobs,
  MAX_ATTEMPTS,
  RETRY_DELAY_BASE,
} from './taskSubmissionQueueStore';
import type { CreateTaskPayload, UpdateTaskPayload } from './taskTypes';

let isQueueProcessing = false;

export function getIsQueueProcessing(): boolean {
  return isQueueProcessing;
}

async function processQueue() {
  if (isQueueProcessing) return;
  await ensureLoaded();

  const now = new Date().getTime();
  const taskJobs = getTaskJobs();
  const nextJob = taskJobs.find((j) => {
    if (j.status === 'queued') return true;
    if (j.status === 'failed' && j.attempts < MAX_ATTEMPTS) {
      const lastAttempt = new Date(j.updatedAt).getTime();
      const delay = Math.pow(2, j.attempts) * RETRY_DELAY_BASE;
      return now - lastAttempt > delay;
    }
    return false;
  });

  if (!nextJob) return;

  isQueueProcessing = true;
  try {
    nextJob.status = 'processing';
    nextJob.updatedAt = new Date().toISOString();
    await persistQueue();

    // 1. Wait for all uploads
    const attachments: { images: string[]; videos: string[]; audios: string[]; files: string[] } = {
      images: [],
      videos: [],
      audios: [],
      files: [],
    };

    for (const jobRef of nextJob.attachmentJobs) {
      try {
        const remoteUrl = await waitForUploadJob(jobRef.id);
        if (jobRef.type === 'image') attachments.images.push(remoteUrl);
        else if (jobRef.type === 'video') attachments.videos.push(remoteUrl);
        else if (jobRef.type === 'audio') attachments.audios.push(remoteUrl);
        else if (jobRef.type === 'file') attachments.files.push(remoteUrl);
      } catch (uploadError) {
        throw new Error(
          `Upload failed for ${jobRef.type}: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`,
        );
      }
    }

    // 2. Prepare final payload
    const payloadAttachments = nextJob.payload.adminSubmission?.attachments;
    const updatedAdminSubmission = {
      ...nextJob.payload.adminSubmission,
      attachments: {
        images: [...(payloadAttachments?.images ?? []), ...attachments.images].filter(Boolean),
        videos: [...(payloadAttachments?.videos ?? []), ...attachments.videos].filter(Boolean),
        audios: [...(payloadAttachments?.audios ?? []), ...attachments.audios].filter(Boolean),
        files: [...(payloadAttachments?.files ?? []), ...attachments.files].filter(Boolean),
      },
    };

    // 3. Create or Update Task
    if (nextJob.taskId) {
      const finalPayload: UpdateTaskPayload = {
        ...nextJob.payload,
        adminSubmission: updatedAdminSubmission,
      };
      await updateTask(nextJob.taskId, finalPayload);
    } else {
      const finalPayload: CreateTaskPayload = {
        ...(nextJob.payload as CreateTaskPayload),
        adminSubmission: updatedAdminSubmission,
      };
      await createTask(finalPayload);
    }

    // 4. Invalidate cache to refresh UI
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks-infinite'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks-overview'] });
    if (nextJob.taskId) {
      void queryClient.invalidateQueries({ queryKey: ['task', nextJob.taskId] });
      void queryClient.invalidateQueries({ queryKey: ['taskDetail', nextJob.taskId] });
      void queryClient.invalidateQueries({ queryKey: ['taskTimeline', nextJob.taskId] });
      void queryClient.invalidateQueries({ queryKey: ['eventTypeCounts', nextJob.taskId] });
    }

    // 5. Cleanup associated upload jobs
    for (const jobRef of nextJob.attachmentJobs) {
      void removeUploadJob(jobRef.id);
    }

    // 5. Cleanup task job
    const currentJobs = getTaskJobs();
    replaceTaskJobs(currentJobs.filter((j) => j.id !== nextJob.id));
    await persistQueue();
  } catch (error) {
    console.error('[TaskSubmissionQueue] Job failed', error);
    nextJob.status = 'failed';
    nextJob.error = error instanceof Error ? error.message : String(error);

    // Treat certain 4xx errors as permanent failures (no point retrying bad payloads).
    // Exclude 401 (token expiry — retry after re-auth) and 429 (rate-limited — let backoff handle it).
    const responseStatus =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
    const isPermanentClientError =
      responseStatus !== undefined && [400, 403, 404, 409, 410, 422].includes(responseStatus);
    if (isPermanentClientError) {
      nextJob.attempts = MAX_ATTEMPTS;
    } else {
      nextJob.attempts += 1;
    }

    nextJob.updatedAt = new Date().toISOString();
    await persistQueue();
  } finally {
    isQueueProcessing = false;
    // Process next job if any
    void processQueue();
  }
}

export { processQueue };
