import client from '../client';
import { mapListSafely } from './mapListSafely';

const CLOUDINARY_UPLOAD_TIMEOUT_MS = 60_000;

interface SignatureResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
  type?: string;
  resourceType?: string;
  resource_type?: string;
  kind?: string;
}

async function getUploadSignature(folder = 'zam-zam', kind?: 'image' | 'video' | 'audio' | 'file'): Promise<SignatureResponse> {
  const r = await client.get<SignatureResponse>('/upload/signature', { params: { folder, kind } });
  return r.data;
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    m4v: 'video/x-m4v',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    aac: 'audio/aac',
    '3gp': 'audio/3gpp',
    amr: 'audio/amr',
    caf: 'audio/x-caf',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/opus',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return mimeMap[ext] ?? 'application/octet-stream';
}

function inferUploadKind(filename: string): 'image' | 'video' | 'audio' | 'file' {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'm4a', 'wav', 'aac', '3gp', 'amr', 'caf', 'ogg', 'oga', 'opus'].includes(ext)) return 'audio';
  return 'file';
}


export async function uploadToCloudinary(localUri: string, folder = 'zam-zam'): Promise<string> {
  const filename = localUri.split('/').pop() ?? 'upload.bin';
  const mimeType = guessMimeType(filename);
  const kind = inferUploadKind(filename);
  const sig = await getUploadSignature(folder, kind);
  const resolvedResourceType = sig.resourceType ?? sig.resource_type ?? 'auto';

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
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resolvedResourceType}/upload`,
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

export interface CustomCake {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  customerName?: string;
  customerDob?: string;
}

export interface UploadedCakeImage {
  id: string;
  name: string;
  phone: string;
  description: string;
  dob?: string;
  referenceImageUrl: string;
  createdAt: string;
}

interface RawCustomCake {
  _id?: string;
  id?: string;
  prompt?: string;
  imageUrl?: string;
  createdAt?: string;
  userId?: string | { name?: string; dob?: string | Date };
}

interface RawUploadedCakeImage {
  _id?: string;
  id?: string;
  name?: string;
  phone?: string;
  description?: string;
  dob?: string | Date;
  userId?: string | { dob?: string | Date };
  referenceImageUrl?: string;
  createdAt?: string;
}

function mapCustomCake(raw: RawCustomCake): CustomCake {
  const user = typeof raw.userId === 'object' && raw.userId ? raw.userId : undefined;
  return {
    id: String(raw._id ?? raw.id ?? ''),
    prompt: raw.prompt ?? '',
    imageUrl: raw.imageUrl ?? '',
    createdAt: raw.createdAt ?? '',
    customerName: user?.name,
    customerDob: user?.dob ? new Date(user.dob).toISOString() : undefined,
  };
}

function mapUploadedCakeImage(raw: RawUploadedCakeImage): UploadedCakeImage {
  const userDob = typeof raw.userId === 'object' && raw.userId ? raw.userId.dob : undefined;
  const dobValue = raw.dob ?? userDob;
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    phone: raw.phone ?? '',
    description: raw.description ?? '',
    dob: dobValue ? new Date(dobValue).toISOString() : undefined,
    referenceImageUrl: raw.referenceImageUrl ?? '',
    createdAt: raw.createdAt ?? '',
  };
}

export const cakeApi = {
  listCustomCakes: () =>
    client
      .get<{ data: RawCustomCake[] } | RawCustomCake[]>('/custom-cakes', { params: { limit: 50 } })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (((r.data as any).data ?? []) as RawCustomCake[]);
        return mapListSafely(raw, 'custom-cakes', mapCustomCake);
      }),

  listUploadedCakes: () =>
    client
      .get<{ data: RawUploadedCakeImage[] } | RawUploadedCakeImage[]>('/uploaded-cakes', { params: { limit: 100 } })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (((r.data as any).data ?? []) as RawUploadedCakeImage[]);
        return mapListSafely(raw, 'uploaded-cakes', mapUploadedCakeImage);
      }),
};
