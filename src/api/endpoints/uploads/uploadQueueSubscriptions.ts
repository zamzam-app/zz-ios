import { ensureLoaded, getJobs, listeners, QueueListener } from './uploadQueueStore';

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
  const existing = getJobs().find((job) => job.id === jobId);
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
