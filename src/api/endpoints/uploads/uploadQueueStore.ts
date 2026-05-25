import AsyncStorage from '@react-native-async-storage/async-storage';

const UPLOAD_QUEUE_STORAGE_KEY = 'upload_queue_v1';

export const DEFAULT_MAX_ATTEMPTS = 4;
export const BASE_RETRY_DELAY_MS = 2_000;
export const MAX_RETRY_DELAY_MS = 30_000;

export { UPLOAD_QUEUE_STORAGE_KEY };

export type UploadQueueStatus = 'queued' | 'uploading' | 'uploaded' | 'failed' | 'canceled';

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

export type QueueListener = (job: UploadQueueJob) => void;

export const listeners = new Set<QueueListener>();

let jobs: UploadQueueJob[] = [];
let isLoaded = false;
let loadingPromise: Promise<void> | null = null;

export function nowIso() {
  return new Date().toISOString();
}

export function parseMaybeDate(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function persistQueue() {
  await AsyncStorage.setItem(UPLOAD_QUEUE_STORAGE_KEY, JSON.stringify(jobs));
}

export { persistQueue };

export async function ensureLoaded() {
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

      // If the app crashed or was killed mid-upload, recover orphaned in-flight jobs.
      const recoveredAt = nowIso();
      let didRecoverInFlightJobs = false;
      jobs = jobs.map((job) => {
        if (job.status !== 'uploading') return job;
        didRecoverInFlightJobs = true;
        return {
          ...job,
          status: 'queued',
          nextAttemptAt: recoveredAt,
          updatedAt: recoveredAt,
        };
      });

      if (didRecoverInFlightJobs) {
        await persistQueue();
      }
    } catch {
      jobs = [];
    } finally {
      isLoaded = true;
    }
  })();

  await loadingPromise;
  loadingPromise = null;
}

export function getJobs(): UploadQueueJob[] {
  return jobs;
}

export function replaceJobs(newJobs: UploadQueueJob[]) {
  jobs = newJobs;
}

export async function updateJob(
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

export function emit(job: UploadQueueJob) {
  listeners.forEach((listener) => listener(job));
}
