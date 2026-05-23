import assert from 'node:assert/strict';

import {
  buildCriticalReviewsQuery,
  filterOpenCriticalReviews,
  getCriticalFocusAreaFromReviews,
  getCriticalReviewsEmptyStateMessage,
  getOpenCriticalReviewCount,
  isOpenCriticalReview,
} from '../src/utils/reviewCritical';

interface TestReview {
  id: string;
  customerName: string;
  outletId: string;
  outletName: string;
  overallRating: number;
  userResponses: unknown[];
  isComplaint: boolean;
  complaintStatus?: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

function createReview(overrides: Partial<TestReview> = {}): TestReview {
  return {
    id: 'review-1',
    customerName: 'Customer One',
    outletId: 'outlet-1',
    outletName: 'Downtown',
    overallRating: 1.5,
    userResponses: [],
    isComplaint: true,
    complaintStatus: 'pending',
    createdAt: '2026-05-19T10:00:00.000Z',
    ...overrides,
  };
}

function testBackendCriticalQueryExcludesResolvedReviews() {
  assert.deepEqual(buildCriticalReviewsQuery(), {
    isComplaint: true,
    severity: 'critical',
    complaintStatus: 'pending',
    unresolvedOnly: true,
    excludeResolved: true,
  });
}

function testFrontendDisplaysOnlyUnresolvedCriticalReviews() {
  const reviews = [
    createReview({ id: 'open-critical' }),
    createReview({ id: 'resolved-critical', complaintStatus: 'resolved' }),
    createReview({ id: 'dismissed-critical', complaintStatus: 'dismissed' }),
    createReview({ id: 'open-concern', overallRating: 2.6 }),
    createReview({ id: 'non-complaint-critical', isComplaint: false }),
  ];

  const filtered = filterOpenCriticalReviews(reviews);
  assert.deepEqual(
    filtered.map((review) => review.id),
    ['open-critical'],
  );
}

function testResolvedIssuesDoNotAppearAfterCriticalFilterClick() {
  assert.equal(isOpenCriticalReview(createReview({ complaintStatus: 'resolved' })), false);
  assert.equal(isOpenCriticalReview(createReview({ complaintStatus: 'dismissed' })), false);
  assert.equal(isOpenCriticalReview(createReview({ complaintStatus: 'pending' })), true);
}

function testQuickInsightsCountMatchesFilteredList() {
  const reviews = [
    createReview({ id: 'r1', outletId: 'outlet-1', outletName: 'Downtown' }),
    createReview({ id: 'r2', outletId: 'outlet-1', outletName: 'Downtown' }),
    createReview({ id: 'r3', outletId: 'outlet-2', outletName: 'Airport' }),
    createReview({ id: 'r4', complaintStatus: 'resolved' }),
  ];

  const filtered = filterOpenCriticalReviews(reviews);
  const focus = getCriticalFocusAreaFromReviews(reviews);

  assert.equal(getOpenCriticalReviewCount(reviews), filtered.length);
  assert.deepEqual(focus, {
    outletId: 'outlet-1',
    outletName: 'Downtown',
    criticalIssues: 2,
  });
}

function testEmptyStateWhenAllCriticalReviewsAreResolved() {
  const reviews = [
    createReview({ id: 'resolved-1', complaintStatus: 'resolved' }),
    createReview({ id: 'resolved-2', complaintStatus: 'dismissed' }),
  ];

  assert.equal(filterOpenCriticalReviews(reviews).length, 0);
  assert.equal(getCriticalFocusAreaFromReviews(reviews), null);
  assert.equal(getCriticalReviewsEmptyStateMessage(true), 'No unresolved critical reviews.');
}

function testRegressionCoverageForExistingReviewBehavior() {
  const reviews = [
    createReview({ id: 'critical-a', outletName: 'Downtown' }),
    createReview({ id: 'critical-b', outletName: 'Airport', outletId: 'outlet-2' }),
  ];

  assert.equal(getOpenCriticalReviewCount(reviews), 2);
  assert.equal(getCriticalReviewsEmptyStateMessage(false), 'No reviews available.');
}

function run() {
  testBackendCriticalQueryExcludesResolvedReviews();
  testFrontendDisplaysOnlyUnresolvedCriticalReviews();
  testResolvedIssuesDoNotAppearAfterCriticalFilterClick();
  testQuickInsightsCountMatchesFilteredList();
  testEmptyStateWhenAllCriticalReviewsAreResolved();
  testRegressionCoverageForExistingReviewBehavior();
}

run();
