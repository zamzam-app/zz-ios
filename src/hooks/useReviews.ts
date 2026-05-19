import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reviewsApi,
  ReviewsQuery,
  ResolveComplaintPayload,
} from '../api/endpoints/reviews';

export const useReviews = (query?: ReviewsQuery) =>
  useQuery({
    queryKey: ['reviews', query],
    queryFn: () => reviewsApi.list(query),
  });

export const useCriticalReviews = (query?: ReviewsQuery) =>
  useQuery({
    queryKey: ['reviews', 'critical-open', query],
    queryFn: () => reviewsApi.listCriticalOpen(query),
  });

export const useReview = (id: string) =>
  useQuery({
    queryKey: ['review', id],
    queryFn: () => reviewsApi.getById(id),
    enabled: !!id,
  });


export const useReviewBadgeStatus = (userId?: string) =>
  useQuery({
    queryKey: ['review-badge-status', userId],
    queryFn: () => reviewsApi.getBadgeStatus(userId!),
    enabled: !!userId,
  });

export const useMarkReviewAsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, userId }: { reviewId: string; userId: string }) =>
      reviewsApi.markAsRead(reviewId, userId),
    onSuccess: (_updated, variables) => {
      qc.invalidateQueries({ queryKey: ['review-badge-status', variables.userId] });
    },
  });
};

export const useResolveComplaint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: ResolveComplaintPayload }) =>
      reviewsApi.resolveComplaint(reviewId, payload),
    onSuccess: (updated, variables) => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['review', variables.reviewId] });
      qc.invalidateQueries({ queryKey: ['review-badge-status'] });
      qc.setQueryData(['review', updated.id], updated);
      if (updated.id !== variables.reviewId) {
        qc.setQueryData(['review', variables.reviewId], updated);
      }
    },
  });
};
