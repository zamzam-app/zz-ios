import AsyncStorage from '@react-native-async-storage/async-storage';

import { CreateTaskPayload, UpdateTaskPayload } from './taskTypes';

const TASK_QUEUE_STORAGE_KEY = 'task_submission_queue_v1';

export { TASK_QUEUE_STORAGE_KEY };

export const MAX_ATTEMPTS = 5;
export const RETRY_DELAY_BASE = 5000; // 5 seconds

export interface TaskSubmissionJob {
  id: string;
  taskId?: string; // If present, this is an update job
  payload: CreateTaskPayload | UpdateTaskPayload;
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
let loadPromise: Promise<void> | null = null;

export async function persistQueue() {
  await AsyncStorage.setItem(TASK_QUEUE_STORAGE_KEY, JSON.stringify(taskJobs));
}

export async function ensureLoaded() {
  if (isLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(TASK_QUEUE_STORAGE_KEY);
      if (raw) {
        taskJobs = JSON.parse(raw);
        // Reset processing jobs to queued if app was killed
        taskJobs = taskJobs.map((job) =>
          job.status === 'processing' ? { ...job, status: 'queued' } : job,
        );
      }
    } catch {
      taskJobs = [];
    }
    isLoaded = true;
    loadPromise = null;
  })();

  return loadPromise;
}

export function getTaskJobs(): TaskSubmissionJob[] {
  return taskJobs;
}

export function replaceTaskJobs(newJobs: TaskSubmissionJob[]) {
  taskJobs = newJobs;
}
