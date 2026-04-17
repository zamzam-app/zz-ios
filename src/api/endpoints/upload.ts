import client from '../client';

const CLOUDINARY_UPLOAD_TIMEOUT_MS = 60_000;

interface SignatureResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}

async function getUploadSignature(folder = 'zam-zam'): Promise<SignatureResponse> {
  const r = await client.get<SignatureResponse>('/upload/signature', { params: { folder } });
  return r.data;
}

export async function uploadToCloudinary(localUri: string, folder = 'zam-zam'): Promise<string> {
  const sig = await getUploadSignature(folder);

  const filename = localUri.split('/').pop() ?? 'image.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as any);
  formData.append('api_key', sig.apiKey);
  formData.append('timestamp', String(sig.timestamp));
  formData.append('signature', sig.signature);
  formData.append('folder', sig.folder);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLOUDINARY_UPLOAD_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
      { method: 'POST', body: formData, signal: controller.signal },
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  const json = await response.json();
  if (!json.secure_url) throw new Error(json.error?.message ?? 'Upload failed');
  return json.secure_url as string;
}

export interface VisualiseCakePayload {
  text?: string;
  baseImage?: string;
  shape?: string;
  flavor?: string;
  extraRequests?: string;
}

export interface VisualiseResult {
  success: boolean;
  imageBase64: string | null;
  mimeType?: string;
  prompt?: string;
  message?: string;
  placeholderImage?: string;
}

export interface CustomCake {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
}

interface RawCustomCake {
  _id?: string;
  id?: string;
  prompt?: string;
  imageUrl?: string;
  createdAt?: string;
}

function mapCustomCake(raw: RawCustomCake): CustomCake {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    prompt: raw.prompt ?? '',
    imageUrl: raw.imageUrl ?? '',
    createdAt: raw.createdAt ?? '',
  };
}

export const cakeApi = {
  visualise: (payload: VisualiseCakePayload) =>
    client.post<VisualiseResult>('/visualise-cake', payload).then((r) => r.data),

  listCustomCakes: () =>
    client
      .get<{ data: RawCustomCake[] } | RawCustomCake[]>('/custom-cakes', { params: { limit: 50 } })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : ((r.data as any).data ?? []);
        return (raw as RawCustomCake[]).map(mapCustomCake);
      }),
};
