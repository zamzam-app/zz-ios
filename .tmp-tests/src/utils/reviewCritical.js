"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isResolvedComplaintStatus = isResolvedComplaintStatus;
exports.isOpenComplaintStatus = isOpenComplaintStatus;
exports.isCriticalReview = isCriticalReview;
exports.isOpenCriticalReview = isOpenCriticalReview;
exports.filterOpenCriticalReviews = filterOpenCriticalReviews;
exports.getOpenCriticalReviewCount = getOpenCriticalReviewCount;
exports.buildCriticalReviewsQuery = buildCriticalReviewsQuery;
exports.getCriticalReviewsEmptyStateMessage = getCriticalReviewsEmptyStateMessage;
exports.getCriticalFocusAreaFromReviews = getCriticalFocusAreaFromReviews;
function isResolvedComplaintStatus(status) {
    return status === 'resolved' || status === 'dismissed';
}
function isOpenComplaintStatus(status) {
    return status === 'pending' || typeof status === 'undefined';
}
function isCriticalReview(review) {
    return Boolean(review.overallRating !== undefined && review.overallRating < 2.0);
}
function isOpenCriticalReview(review) {
    return Boolean(review.isComplaint
        && isCriticalReview(review)
        && isOpenComplaintStatus(review.complaintStatus));
}
function filterOpenCriticalReviews(reviews) {
    return reviews.filter(isOpenCriticalReview);
}
function getOpenCriticalReviewCount(reviews) {
    return filterOpenCriticalReviews(reviews).length;
}
function buildCriticalReviewsQuery(query) {
    return {
        ...query,
        isComplaint: true,
        severity: 'critical',
        complaintStatus: 'pending',
        unresolvedOnly: true,
        excludeResolved: true,
    };
}
function getCriticalReviewsEmptyStateMessage(hasActiveCriticalFilter) {
    return hasActiveCriticalFilter
        ? 'No unresolved critical reviews.'
        : 'No reviews available.';
}
function getCriticalFocusAreaFromReviews(reviews) {
    const openCriticalReviews = filterOpenCriticalReviews(reviews);
    if (openCriticalReviews.length === 0)
        return null;
    const byOutlet = new Map();
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
        if (b.criticalIssues !== a.criticalIssues)
            return b.criticalIssues - a.criticalIssues;
        return a.outletName.localeCompare(b.outletName);
    })[0] ?? null;
}
