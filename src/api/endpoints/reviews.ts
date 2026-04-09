import client from '../client';

export type ComplaintStatus = 'pending' | 'resolved' | 'dismissed';

export interface UserResponse {
  questionId: string | { _id: string; title?: string; type?: string };
  answer: string | string[] | number;
}

export interface Review {
  id: string;
  customerName: string;
  outletId: string;
  outletName: string;
  overallRating: number;
  userResponses: UserResponse[];
  isComplaint: boolean;
  complaintStatus?: ComplaintStatus;
  complaintReason?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface ReviewsQuery {
  page?: number;
  limit?: number;
  outletId?: string;
}

export interface ResolveComplaintPayload {
  complaintStatus: ComplaintStatus;
  resolvedBy: string;
  resolutionNotes?: string;
}

interface RawReview {
  _id?: string;
  id?: string;
  userId?: string | { _id?: string; name?: string };
  outletId?: string | { _id?: string; name?: string };
  overallRating?: number;
  userResponses?: UserResponse[];
  isComplaint?: boolean;
  complaintStatus?: ComplaintStatus;
  complaintReason?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt?: string;
}

function mapReview(raw: RawReview): Review {
  const id = String(raw._id ?? raw.id ?? '');

  let customerName = 'Customer';
  if (typeof raw.userId === 'object' && raw.userId?.name) customerName = raw.userId.name;

  let outletId = '';
  let outletName = 'Unknown Outlet';
  if (typeof raw.outletId === 'object' && raw.outletId) {
    outletId = String(raw.outletId._id ?? '');
    outletName = raw.outletId.name ?? outletName;
  } else if (typeof raw.outletId === 'string') {
    outletId = raw.outletId;
  }

  return {
    id,
    customerName,
    outletId,
    outletName,
    overallRating: raw.overallRating ?? 0,
    userResponses: raw.userResponses ?? [],
    isComplaint: raw.isComplaint ?? false,
    complaintStatus: raw.complaintStatus,
    complaintReason: raw.complaintReason,
    resolvedAt: raw.resolvedAt,
    resolvedBy: raw.resolvedBy,
    resolutionNotes: raw.resolutionNotes,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export const reviewsApi = {
  list: (query?: ReviewsQuery) =>
    client
      .get<{ data: RawReview[]; meta?: unknown } | RawReview[]>('/review', { params: query })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawReview[] }).data ?? [];
        return raw.map(mapReview);
      }),

  getById: (id: string) =>
    client.get<RawReview>(`/review/${id}`).then((r) => mapReview(r.data)),

  resolveComplaint: (reviewId: string, payload: ResolveComplaintPayload) =>
    client
      .post<RawReview>(`/review/resolve-complaint/${reviewId}`, payload)
      .then((r) => mapReview(r.data)),
};
