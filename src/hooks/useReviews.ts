import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi, ReviewsQuery, ResolveComplaintPayload } from '../api/endpoints/reviews';

export const useReviews = (query?: ReviewsQuery) =>
  useQuery({
    queryKey: ['reviews', query],
    queryFn: () => reviewsApi.list(query),
  });

export const useReview = (id: string) =>
  useQuery({
    queryKey: ['review', id],
    queryFn: () => reviewsApi.getById(id),
    enabled: !!id,
  });

export const useResolveComplaint = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: ResolveComplaintPayload }) =>
      reviewsApi.resolveComplaint(reviewId, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.setQueryData(['review', updated.id], updated);
    },
  });
};
