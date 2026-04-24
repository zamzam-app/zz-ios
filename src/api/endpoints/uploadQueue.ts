import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadToCloudinary } from './upload';

const UPLOAD_QUEUE_STORAGE_KEY = 'upload_queue_v1';
const DEFAULT_MAX_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 30_000;

export type UploadQueueStatus =
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'failed'
  | 'canceled';

export interface UploadQueueJob {
  id: string;
  localUri: string;
  folder: string;
  status: UploadQueueStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt?: string;
  remoteUrl?: string;
  error?: string;
}

type QueueListener = (job: UploadQueueJob) => void;

let jobs: UploadQueueJob[] = [];
let isLoaded = false;
let loadingPromise: Promise<void> | null = null;
let isProcessing = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<QueueListener>();

function nowIso() {
  return new Date().toISOString();
}

function parseMaybeDate(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function persistQueue() {
  await AsyncStorage.setItem(UPLOAD_QUEUE_STORAGE_KEY, JSON.stringify(jobs));
}

async function ensureLoaded() {
  if (isLoaded) return;
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(UPLOAD_QUEUE_STORAGE_KEY);
      if (!raw) {
        jobs = [];
        return;
      }

      const parsed = JSON.parse(raw) as UploadQueueJob[];
      jobs = Array.isArray(parsed) ? parsed : [];
    } catch {
      jobs = [];
    } finally {
      isLoaded = true;
    }
  })();

  await loadingPromise;
  loadingPromise = null;
}

function emit(job: UploadQueueJob) {
  listeners.forEach((listener) => listener(job));
}

async function updateJob(
  id: string,
  patch: Partial<UploadQueueJob> | ((current: UploadQueueJob) => Partial<UploadQueueJob>),
) {
  const index = jobs.findIndex((job) => job.id === id);
  if (index < 0) return;

  const current = jobs[index];
  const nextPatch = typeof patch === 'function' ? patch(current) : patch;
  const updated: UploadQueueJob = {
    ...current,
    ...nextPatch,
    updatedAt: nowIso(),
  };

  jobs[index] = updated;
  await persistQueue();
  emit(updated);
}

function findNextJob(nowMs: number): UploadQueueJob | undefined {
  return jobs
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
  const nextRetryMs = jobs
    .filter((job) => job.status === 'queued' && job.nextAttemptAt)
    .map((job) => parseMaybeDate(job.nextAttemptAt))
    .filter((ms) => ms > nowMs)
    .sort((a, b) => a - b)[0];

  if (!nextRetryMs) return;

  retryTimer = setTimeout(() => {
    void processQueue();
  }, Math.max(250, nextRetryMs - nowMs));
}

async function processQueue() {
  await ensureLoaded();
  if (isProcessing) return;

  isProcessing = true;
  try {
    // eslint-disable-next-line no-constant-condition
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

      const fresh = jobs.find((job) => job.id === next.id);
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
        const latest = jobs.find((job) => job.id === fresh.id);
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

export async function enqueueCloudinaryUpload(localUri: string, folder = 'zam-zam'): Promise<UploadQueueJob> {
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

  jobs = [...jobs, job];
  await persistQueue();
  emit(job);
  void processQueue();

  return job;
}

export async function getUploadJob(jobId: string): Promise<UploadQueueJob | undefined> {
  await ensureLoaded();
  return jobs.find((job) => job.id === jobId);
}

export function subscribeToUploadJob(jobId: string, listener: QueueListener): () => void {
  const wrapped: QueueListener = (job) => {
    if (job.id === jobId) listener(job);
  };
  listeners.add(wrapped);

  return () => {
    listeners.delete(wrapped);
  };
}

export async function waitForUploadJob(jobId: string): Promise<string> {
  await ensureLoaded();
  const existing = jobs.find((job) => job.id === jobId);
  if (!existing) {
    throw new Error('Upload job not found');
  }

  if (existing.status === 'uploaded' && existing.remoteUrl) {
    return existing.remoteUrl;
  }
  if (existing.status === 'failed') {
    throw new Error(existing.error ?? 'Upload failed');
  }
  if (existing.status === 'canceled') {
    throw new Error('Upload canceled');
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeToUploadJob(jobId, (job) => {
      if (job.status === 'uploaded' && job.remoteUrl) {
        unsubscribe();
        resolve(job.remoteUrl);
      } else if (job.status === 'failed') {
        unsubscribe();
        reject(new Error(job.error ?? 'Upload failed'));
      } else if (job.status === 'canceled') {
        unsubscribe();
        reject(new Error('Upload canceled'));
      }
    });
  });
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
  jobs = jobs.filter((job) => job.id !== jobId);
  await persistQueue();
}

// Start queue processing for persisted queued jobs when module is used.
void ensureLoaded().then(() => {
  void processQueue();
});
