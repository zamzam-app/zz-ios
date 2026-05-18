import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateTaskPayload, tasksApi } from './tasks';
import { waitForUploadJob, removeUploadJob } from './uploadQueue';
import { queryClient } from '../queryClient';

const TASK_QUEUE_STORAGE_KEY = 'task_submission_queue_v1';
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_BASE = 5000; // 5 seconds

export interface TaskSubmissionJob {
  id: string;
  taskId?: string; // If present, this is an update job
  payload: any; // Can be CreateTaskPayload or UpdateTaskPayload
  attachmentJobs: {
    id: string;
    type: 'image' | 'video' | 'audio' | 'file';
  }[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

let taskJobs: TaskSubmissionJob[] = [];
let isLoaded = false;
let isQueueProcessing = false;
let loadPromise: Promise<void> | null = null;

async function persistQueue() {
  await AsyncStorage.setItem(TASK_QUEUE_STORAGE_KEY, JSON.stringify(taskJobs));
}

async function ensureLoaded() {
  if (isLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(TASK_QUEUE_STORAGE_KEY);
      if (raw) {
        taskJobs = JSON.parse(raw);
        // Reset processing jobs to queued if app was killed
        taskJobs = taskJobs.map(job => job.status === 'processing' ? { ...job, status: 'queued' } : job);
      }
    } catch {
      taskJobs = [];
    }
    isLoaded = true;
    loadPromise = null;
  })();

  return loadPromise;
}

async function processQueue() {
  if (isQueueProcessing) return;
  await ensureLoaded();
  
  const now = new Date().getTime();
  const nextJob = taskJobs.find(j => {
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
    const attachments: any = {
      images: [],
      videos: [],
      audios: [],
      files: []
    };

    for (const jobRef of nextJob.attachmentJobs) {
      try {
        const remoteUrl = await waitForUploadJob(jobRef.id);
        if (jobRef.type === 'image') attachments.images.push(remoteUrl);
        else if (jobRef.type === 'video') attachments.videos.push(remoteUrl);
        else if (jobRef.type === 'audio') attachments.audios.push(remoteUrl);
        else if (jobRef.type === 'file') attachments.files.push(remoteUrl);
      } catch (uploadError) {
        throw new Error(`Upload failed for ${jobRef.type}: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
      }
    }

    // 2. Prepare final payload
    const payloadAttachments = nextJob.payload.adminSubmission?.attachments;
    const finalPayload: CreateTaskPayload = {
      ...nextJob.payload,
      adminSubmission: {
        ...nextJob.payload.adminSubmission,
        attachments: {
          images: [
            ...(payloadAttachments?.images ?? []),
            ...attachments.images
          ].filter(Boolean),
          videos: [
            ...(payloadAttachments?.videos ?? []),
            ...attachments.videos
          ].filter(Boolean),
          audios: [
            ...(payloadAttachments?.audios ?? []),
            ...attachments.audios
          ].filter(Boolean),
          files: [
            ...(payloadAttachments?.files ?? []),
            ...attachments.files
          ].filter(Boolean),
        }
      }
    };

    // 3. Create or Update Task
    if (nextJob.taskId) {
      await tasksApi.update(nextJob.taskId, finalPayload);
    } else {
      await tasksApi.create(finalPayload);
    }

    // 4. Invalidate cache to refresh UI
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks-infinite'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks-overview'] });

    // 5. Cleanup associated upload jobs
    for (const jobRef of nextJob.attachmentJobs) {
      void removeUploadJob(jobRef.id);
    }

    // 5. Cleanup task job
    taskJobs = taskJobs.filter(j => j.id !== nextJob.id);
    await persistQueue();
  } catch (error) {
    console.error('[TaskSubmissionQueue] Job failed', error);
    nextJob.status = 'failed';
    nextJob.error = error instanceof Error ? error.message : String(error);
    
    const isClientError = (error as any)?.response?.status >= 400 && (error as any)?.response?.status < 500;
    if (isClientError) {
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

export async function enqueueTaskSubmission(
  payload: any,
  attachmentJobs: { id: string; type: 'image' | 'video' | 'audio' | 'file' }[],
  taskId?: string
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

  taskJobs.push(job);
  await persistQueue();
  void processQueue();
  return job.id;
}

// Initial processing
void ensureLoaded().then(() => void processQueue());

// Export helpers for UI
export function getTaskQueueStatus() {
  const failed = taskJobs.filter(j => j.status === 'failed' && j.attempts >= MAX_ATTEMPTS);
  const pending = taskJobs.filter(j => j.status === 'queued' || j.status === 'processing' || (j.status === 'failed' && j.attempts < MAX_ATTEMPTS));
  return {
    pendingCount: pending.length,
    failedCount: failed.length,
    syncing: isQueueProcessing,
    failedJobs: failed
  };
}

export async function retryFailedJobs() {
  await ensureLoaded();
  taskJobs = taskJobs.map(j => 
    j.status === 'failed' ? { ...j, status: 'queued', attempts: 0, updatedAt: new Date().toISOString() } : j
  );
  await persistQueue();
  void processQueue();
}

export async function clearFailedJobs() {
  await ensureLoaded();
  taskJobs = taskJobs.filter(j => j.status !== 'failed');
  await persistQueue();
}

export async function clearAllPendingJobs() {
  await ensureLoaded();

  // 1. Mark retryable failed jobs as permanently failed (attempts = MAX_ATTEMPTS)
  // so they stop retrying and move to the "failed" section of the banner,
  // providing feedback to the user rather than silently discarding them.
  taskJobs = taskJobs.map(j => {
    if (j.status === 'failed' && j.attempts < MAX_ATTEMPTS) {
      return {
        ...j,
        attempts: MAX_ATTEMPTS,
        updatedAt: new Date().toISOString(),
        error: j.error || 'Cancelled by user while retrying'
      };
    }
    return j;
  });

  // 2. Clean up associated upload jobs for discarded 'queued' or 'processing' tasks
  const discardedJobs = taskJobs.filter(j => j.status === 'queued' || j.status === 'processing');
  for (const job of discardedJobs) {
    for (const jobRef of job.attachmentJobs) {
      void removeUploadJob(jobRef.id);
    }
  }

  // 3. Keep all failed jobs while removing queued and processing jobs
  taskJobs = taskJobs.filter(j => j.status === 'failed');

  await persistQueue();
}

// Periodic check for retries (every 30 seconds)
setInterval(() => {
  if (!isQueueProcessing) void processQueue();
}, 30000);
