import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateTaskPayload, tasksApi } from './tasks';
import { waitForUploadJob, removeUploadJob } from './uploadQueue';
import { queryClient } from '../queryClient';

const TASK_QUEUE_STORAGE_KEY = 'task_submission_queue_v1';

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
let isProcessing = false;

async function persistQueue() {
  await AsyncStorage.setItem(TASK_QUEUE_STORAGE_KEY, JSON.stringify(taskJobs));
}

async function ensureLoaded() {
  if (isLoaded) return;
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
}

async function processQueue() {
  if (isProcessing) return;
  await ensureLoaded();
  
  const nextJob = taskJobs.find(j => j.status === 'queued');
  if (!nextJob) return;

  isProcessing = true;
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
    nextJob.attempts += 1;
    nextJob.updatedAt = new Date().toISOString();
    await persistQueue();
  } finally {
    isProcessing = false;
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
