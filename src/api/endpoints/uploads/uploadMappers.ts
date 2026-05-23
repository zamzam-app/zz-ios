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

export interface RawCustomCake {
  _id?: string;
  id?: string;
  prompt?: string;
  imageUrl?: string;
  createdAt?: string;
  userId?: string | { name?: string; dob?: string | Date };
}

export interface RawUploadedCakeImage {
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

export function mapCustomCake(raw: RawCustomCake): CustomCake {
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

export function mapUploadedCakeImage(raw: RawUploadedCakeImage): UploadedCakeImage {
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
