import { CreateTaskPayload, UpdateTaskPayload } from '../tasks';

import { processQueue, getIsQueueProcessing } from './taskSubmissionProcessor';
import {
  ensureLoaded,
  persistQueue,
  getTaskJobs,
  replaceTaskJobs,
  TaskSubmissionJob,
  MAX_ATTEMPTS,
} from './taskSubmissionQueueStore';
import { removeUploadJob } from './uploadQueueApi';

export async function enqueueTaskSubmission(
  payload: CreateTaskPayload | UpdateTaskPayload,
  attachmentJobs: { id: string; type: 'image' | 'video' | 'audio' | 'file' }[],
  taskId?: string,
) {
  await ensureLoaded();
  const job: TaskSubmissionJob = {
    id: `task-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    taskId,
    payload,
    attachmentJobs,
    status: 'queued',
    attempts: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  replaceTaskJobs([...getTaskJobs(), job]);
  await persistQueue();
  void processQueue();
  return job.id;
}

// Initial processing
void ensureLoaded().then(() => void processQueue());

// Export helpers for UI
export function getTaskQueueStatus() {
  const taskJobs = getTaskJobs();
  const failed = taskJobs.filter((j) => j.status === 'failed' && j.attempts >= MAX_ATTEMPTS);
  const pending = taskJobs.filter(
    (j) =>
      j.status === 'queued' ||
      j.status === 'processing' ||
      (j.status === 'failed' && j.attempts < MAX_ATTEMPTS),
  );
  return {
    pendingCount: pending.length,
    failedCount: failed.length,
    syncing: getIsQueueProcessing(),
    failedJobs: failed,
  };
}

export async function retryFailedJobs() {
  await ensureLoaded();
  replaceTaskJobs(
    getTaskJobs().map((j) =>
      j.status === 'failed'
        ? { ...j, status: 'queued', attempts: 0, updatedAt: new Date().toISOString() }
        : j,
    ),
  );
  await persistQueue();
  void processQueue();
}

export async function clearFailedJobs() {
  await ensureLoaded();
  replaceTaskJobs(getTaskJobs().filter((j) => j.status !== 'failed'));
  await persistQueue();
}

export async function clearAllPendingJobs() {
  await ensureLoaded();

  let taskJobs = getTaskJobs();

  // 1. Mark retryable failed jobs as permanently failed (attempts = MAX_ATTEMPTS)
  // so they stop retrying and move to the "failed" section of the banner,
  // providing feedback to the user rather than silently discarding them.
  taskJobs = taskJobs.map((j) => {
    if (j.status === 'failed' && j.attempts < MAX_ATTEMPTS) {
      return {
        ...j,
        attempts: MAX_ATTEMPTS,
        updatedAt: new Date().toISOString(),
        error: j.error || 'Cancelled by user while retrying',
      };
    }
    return j;
  });

  // 2. Clean up associated upload jobs ONLY for tasks that are actually being discarded (i.e. 'queued' tasks)
  const discardedJobs = taskJobs.filter((j) => j.status === 'queued');
  for (const job of discardedJobs) {
    for (const jobRef of job.attachmentJobs) {
      void removeUploadJob(jobRef.id);
    }
  }

  // 3. Keep all failed jobs AND the active 'processing' job, while discarding queued ones
  taskJobs = taskJobs.filter((j) => j.status === 'failed' || j.status === 'processing');

  replaceTaskJobs(taskJobs);
  await persistQueue();
}

// Periodic check for retries (every 30 seconds)
setInterval(() => {
  if (!getIsQueueProcessing()) void processQueue();
}, 30000);
