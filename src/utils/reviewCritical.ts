export type ComplaintStatusLike = 'pending' | 'resolved' | 'dismissed';

export type ReviewQueryLike = {
  page?: number;
  limit?: number;
  outletId?: string;
  isComplaint?: boolean;
  complaintStatus?: ComplaintStatusLike | 'open';
  severity?: 'critical' | 'concern';
  unresolvedOnly?: boolean;
  excludeResolved?: boolean;
};

export type CriticalReviewLike = {
  id?: string;
  outletId?: string;
  outletName?: string;
  isComplaint?: boolean;
  overallRating?: number;
  complaintStatus?: ComplaintStatusLike;
};

export type CriticalFocusAreaModel = {
  outletId: string;
  outletName: string;
  criticalIssues: number;
} | null;

export function isResolvedComplaintStatus(status?: ComplaintStatusLike): boolean {
  return status === 'resolved' || status === 'dismissed';
}

export function isOpenComplaintStatus(status?: ComplaintStatusLike): boolean {
  return status === 'pending' || typeof status === 'undefined';
}

export function isCriticalReview(review: CriticalReviewLike): boolean {
  return Boolean(review.overallRating !== undefined && review.overallRating < 2.0);
}

export function isOpenCriticalReview(review: CriticalReviewLike): boolean {
  return Boolean(
    review.isComplaint
    && isCriticalReview(review)
    && isOpenComplaintStatus(review.complaintStatus),
  );
}

export function filterOpenCriticalReviews<T extends CriticalReviewLike>(reviews: T[]): T[] {
  return reviews.filter(isOpenCriticalReview);
}

export function getOpenCriticalReviewCount(reviews: CriticalReviewLike[]): number {
  return filterOpenCriticalReviews(reviews).length;
}

export function buildCriticalReviewsQuery(query?: ReviewQueryLike): ReviewQueryLike {
  return {
    ...query,
    isComplaint: true,
    severity: 'critical',
    complaintStatus: 'pending',
    unresolvedOnly: true,
    excludeResolved: true,
  };
}

export function getCriticalReviewsEmptyStateMessage(hasActiveCriticalFilter: boolean): string {
  return hasActiveCriticalFilter
    ? 'No unresolved critical reviews.'
    : 'No reviews available.';
}

export function getCriticalFocusAreaFromReviews<T extends CriticalReviewLike>(reviews: T[]): CriticalFocusAreaModel {
  const openCriticalReviews = filterOpenCriticalReviews(reviews);
  if (openCriticalReviews.length === 0) return null;

  const byOutlet = new Map<string, CriticalFocusAreaModel extends null ? never : NonNullable<CriticalFocusAreaModel>>();

  for (const review of openCriticalReviews) {
    const outletId = review.outletId || `name:${review.outletName || 'Unknown Outlet'}`;
    const outletName = review.outletName || 'Unknown Outlet';
    const existing = byOutlet.get(outletId);

    if (existing) {
      existing.criticalIssues += 1;
      continue;
    }

    byOutlet.set(outletId, {
      outletId,
      outletName,
      criticalIssues: 1,
    });
  }

  return Array.from(byOutlet.values()).sort((a, b) => {
    if (b.criticalIssues !== a.criticalIssues) return b.criticalIssues - a.criticalIssues;
    return a.outletName.localeCompare(b.outletName);
  })[0] ?? null;
}
