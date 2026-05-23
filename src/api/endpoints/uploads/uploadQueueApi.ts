import { processQueue } from './uploadQueueProcessor';
import {
  ensureLoaded,
  nowIso,
  getJobs,
  replaceJobs,
  persistQueue,
  emit,
  updateJob,
  UploadQueueJob,
  DEFAULT_MAX_ATTEMPTS,
} from './uploadQueueStore';

export async function enqueueCloudinaryUpload(
  localUri: string,
  folder = 'zam-zam',
): Promise<UploadQueueJob> {
  await ensureLoaded();

  const job: UploadQueueJob = {
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    localUri,
    folder,
    status: 'queued',
    attempts: 0,
    maxAttempts: DEFAULT_MAX_ATTEMPTS,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    nextAttemptAt: nowIso(),
  };

  replaceJobs([...getJobs(), job]);
  await persistQueue();
  emit(job);
  void processQueue();

  return job;
}

export async function getUploadJob(jobId: string): Promise<UploadQueueJob | undefined> {
  await ensureLoaded();
  return getJobs().find((job) => job.id === jobId);
}

export async function cancelUploadJob(jobId: string) {
  await ensureLoaded();
  await updateJob(jobId, {
    status: 'canceled',
    error: 'Canceled by user',
    nextAttemptAt: undefined,
  });
}

export async function removeUploadJob(jobId: string) {
  await ensureLoaded();
  replaceJobs(getJobs().filter((job) => job.id !== jobId));
  await persistQueue();
}

// Start queue processing for persisted queued jobs when module is used.
void ensureLoaded().then(() => {
  void processQueue();
});
