import { uploadToCloudinary } from './cloudinaryUploadApi';
import {
  ensureLoaded,
  updateJob,
  parseMaybeDate,
  getJobs,
  BASE_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
  UploadQueueJob,
} from './uploadQueueStore';

let isProcessing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function findNextJob(nowMs: number): UploadQueueJob | undefined {
  return getJobs()
    .filter((job) => job.status === 'queued')
    .filter((job) => {
      if (!job.nextAttemptAt) return true;
      return parseMaybeDate(job.nextAttemptAt) <= nowMs;
    })
    .sort((a, b) => parseMaybeDate(a.createdAt) - parseMaybeDate(b.createdAt))[0];
}

function scheduleNextRetry() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  const nowMs = Date.now();
  const nextRetryMs = getJobs()
    .filter((job) => job.status === 'queued' && job.nextAttemptAt)
    .map((job) => parseMaybeDate(job.nextAttemptAt))
    .filter((ms) => ms > nowMs)
    .sort((a, b) => a - b)[0];

  if (!nextRetryMs) return;

  retryTimer = setTimeout(
    () => {
      void processQueue();
    },
    Math.max(250, nextRetryMs - nowMs),
  );
}

async function processQueue() {
  await ensureLoaded();
  if (isProcessing) return;

  isProcessing = true;
  try {
    while (true) {
      const next = findNextJob(Date.now());
      if (!next) break;

      const canceledBeforeStart = next.status === 'canceled';
      if (canceledBeforeStart) continue;

      await updateJob(next.id, {
        status: 'uploading',
        attempts: next.attempts + 1,
        error: undefined,
        nextAttemptAt: undefined,
      });

      const fresh = getJobs().find((job) => job.id === next.id);
      if (!fresh || fresh.status === 'canceled') {
        continue;
      }

      try {
        const remoteUrl = await uploadToCloudinary(fresh.localUri, fresh.folder);
        await updateJob(fresh.id, {
          status: 'uploaded',
          remoteUrl,
          error: undefined,
          nextAttemptAt: undefined,
        });
      } catch (error) {
        const latest = getJobs().find((job) => job.id === fresh.id);
        if (!latest) continue;
        if (latest.status === 'canceled') continue;

        const attempt = latest.attempts;
        if (attempt >= latest.maxAttempts) {
          await updateJob(latest.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed',
            nextAttemptAt: undefined,
          });
        } else {
          const delay = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
          await updateJob(latest.id, {
            status: 'queued',
            error: error instanceof Error ? error.message : 'Upload failed',
            nextAttemptAt: new Date(Date.now() + delay).toISOString(),
          });
        }
      }
    }
  } finally {
    isProcessing = false;
    scheduleNextRetry();
  }
}

export { processQueue };
