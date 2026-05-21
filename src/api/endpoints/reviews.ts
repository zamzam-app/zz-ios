import client from '../client';
import { mapListSafely } from './mapListSafely';
import { buildCriticalReviewsQuery, filterOpenCriticalReviews } from '../../utils/reviewCritical';

export type ComplaintStatus = 'pending' | 'resolved' | 'dismissed';

export interface UserResponse {
  questionId: string | { _id: string; title?: string; type?: string };
  answer: string | string[] | number;
}

export interface ResolutionAttachments {
  images: string[];
  videos: string[];
  audios: string[];
  files: string[];
}

export interface ReviewBadgeStatus {
  unreadCount: number;
  pendingCount: number;
  hasUnread: boolean;
}

export interface Review {
  id: string;
  customerName: string;
  customerPhone?: string;
  outletId: string;
  outletName: string;
  formId?: string;
  overallRating: number;
  userResponses: UserResponse[];
  isComplaint: boolean;
  complaintStatus?: ComplaintStatus;
  complaintReason?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByName?: string;
  resolutionNotes?: string;
  resolutionAttachments?: ResolutionAttachments;
  createdAt: string;
}

export interface ReviewsQuery {
  page?: number;
  limit?: number;
  outletId?: string;
  isComplaint?: boolean;
  complaintStatus?: ComplaintStatus | 'open';
  severity?: 'critical' | 'concern';
  unresolvedOnly?: boolean;
  excludeResolved?: boolean;
}

export interface ResolveComplaintPayload {
  complaintStatus: ComplaintStatus;
  resolvedBy: string;
  resolutionNotes?: string;
  images?: string[];
  videos?: string[];
  audios?: string[];
  files?: string[];
}

interface RawReview {
  _id?: string;
  id?: string;
  formId?: string | { _id?: string; id?: string };
  userId?: string | { _id?: string; name?: string };
  outletId?: string | { _id?: string; name?: string };
  overallRating?: number;
  userResponses?: UserResponse[];
  isComplaint?: boolean;
  complaintStatus?: ComplaintStatus;
  complaintReason?: string;
  resolvedAt?: string;
  resolvedBy?: string | { _id?: string; id?: string; name?: string };
  resolutionNotes?: string;
  resolutionAttachments?: ResolutionAttachments;
  createdAt?: string;
}

type RawReviewEnvelope = { data?: RawReview };

function isRawReviewEnvelope(value: unknown): value is RawReviewEnvelope {
  return Boolean(
    value
    && typeof value === 'object'
    && 'data' in (value as Record<string, unknown>),
  );
}

function unwrapRawReview(value: RawReview | RawReviewEnvelope): RawReview {
  if (isRawReviewEnvelope(value) && value.data && typeof value.data === 'object') {
    return value.data;
  }
  return value as RawReview;
}

function mapReview(raw: RawReview): Review {
  const id = String(raw._id ?? raw.id ?? '');
  const formId = typeof raw.formId === 'string'
    ? raw.formId
    : raw.formId?._id
      ? String(raw.formId._id)
      : raw.formId?.id
        ? String(raw.formId.id)
        : undefined;

  let customerName = 'Customer';
  let customerPhone: string | undefined;
  if (typeof raw.userId === 'object' && raw.userId) {
    if (raw.userId.name) customerName = raw.userId.name;
    if ((raw.userId as any).phoneNumber) customerPhone = (raw.userId as any).phoneNumber;
  }

  let outletId = '';
  let outletName = 'Unknown Outlet';
  if (typeof raw.outletId === 'object' && raw.outletId) {
    outletId = String(raw.outletId._id ?? '');
    outletName = raw.outletId.name ?? outletName;
  } else if (typeof raw.outletId === 'string') {
    outletId = raw.outletId;
  }

  const resolvedBy = typeof raw.resolvedBy === 'string'
    ? raw.resolvedBy
    : raw.resolvedBy?._id
      ? String(raw.resolvedBy._id)
      : raw.resolvedBy?.id
        ? String(raw.resolvedBy.id)
        : undefined;
  const resolvedByName = typeof raw.resolvedBy === 'object' && raw.resolvedBy?.name
    ? raw.resolvedBy.name
    : undefined;

  return {
    id,
    customerName,
    customerPhone,
    outletId,
    outletName,
    formId,
    overallRating: raw.overallRating ?? 0,
    userResponses: raw.userResponses ?? [],
    isComplaint: raw.isComplaint ?? false,
    complaintStatus: raw.complaintStatus,
    complaintReason: raw.complaintReason,
    resolvedAt: raw.resolvedAt,
    resolvedBy,
    resolvedByName,
    resolutionNotes: raw.resolutionNotes,
    resolutionAttachments: raw.resolutionAttachments,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export const reviewsApi = {
  getBadgeStatus: (userId: string) =>
    client
      .get<ReviewBadgeStatus>(`/review/badge-status/${userId}`)
      .then((r) => r.data),

  markAsRead: (reviewId: string, userId: string) =>
    client
      .post<ReviewBadgeStatus>(`/review/${reviewId}/mark-read`, { userId })
      .then((r) => r.data),

  list: (query?: ReviewsQuery) =>
    client
      .get<{ data: RawReview[]; meta?: unknown } | RawReview[]>('/review', { params: query })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawReview[] }).data ?? [];
        return mapListSafely(raw, 'reviews', mapReview);
      }),

  listCriticalOpen: (query?: ReviewsQuery) =>
    reviewsApi.list(buildCriticalReviewsQuery(query)).then((reviews) => {
      const filtered = filterOpenCriticalReviews(reviews);
      if (filtered.length !== reviews.length) {
        console.warn('[reviewsApi.listCriticalOpen] Backend returned resolved or non-critical reviews; filtering client-side safeguard applied.');
      }
      return filtered;
    }),

  getById: (id: string) =>
    client
      .get<RawReview | RawReviewEnvelope>(`/review/${id}`)
      .then((r) => mapReview(unwrapRawReview(r.data))),

  resolveComplaint: (reviewId: string, payload: ResolveComplaintPayload) =>
    client
      .post<RawReview | RawReviewEnvelope>(`/review/resolve-complaint/${reviewId}`, payload)
      .then((r) => mapReview(unwrapRawReview(r.data))),
};
