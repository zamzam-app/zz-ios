"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const reviewCritical_1 = require("../src/utils/reviewCritical");
function createReview(overrides = {}) {
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
    strict_1.default.deepEqual((0, reviewCritical_1.buildCriticalReviewsQuery)(), {
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
    const filtered = (0, reviewCritical_1.filterOpenCriticalReviews)(reviews);
    strict_1.default.deepEqual(filtered.map((review) => review.id), ['open-critical']);
}
function testResolvedIssuesDoNotAppearAfterCriticalFilterClick() {
    strict_1.default.equal((0, reviewCritical_1.isOpenCriticalReview)(createReview({ complaintStatus: 'resolved' })), false);
    strict_1.default.equal((0, reviewCritical_1.isOpenCriticalReview)(createReview({ complaintStatus: 'dismissed' })), false);
    strict_1.default.equal((0, reviewCritical_1.isOpenCriticalReview)(createReview({ complaintStatus: 'pending' })), true);
}
function testQuickInsightsCountMatchesFilteredList() {
    const reviews = [
        createReview({ id: 'r1', outletId: 'outlet-1', outletName: 'Downtown' }),
        createReview({ id: 'r2', outletId: 'outlet-1', outletName: 'Downtown' }),
        createReview({ id: 'r3', outletId: 'outlet-2', outletName: 'Airport' }),
        createReview({ id: 'r4', complaintStatus: 'resolved' }),
    ];
    const filtered = (0, reviewCritical_1.filterOpenCriticalReviews)(reviews);
    const focus = (0, reviewCritical_1.getCriticalFocusAreaFromReviews)(reviews);
    strict_1.default.equal((0, reviewCritical_1.getOpenCriticalReviewCount)(reviews), filtered.length);
    strict_1.default.deepEqual(focus, {
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
    strict_1.default.equal((0, reviewCritical_1.filterOpenCriticalReviews)(reviews).length, 0);
    strict_1.default.equal((0, reviewCritical_1.getCriticalFocusAreaFromReviews)(reviews), null);
    strict_1.default.equal((0, reviewCritical_1.getCriticalReviewsEmptyStateMessage)(true), 'No unresolved critical reviews.');
}
function testRegressionCoverageForExistingReviewBehavior() {
    const reviews = [
        createReview({ id: 'critical-a', outletName: 'Downtown' }),
        createReview({ id: 'critical-b', outletName: 'Airport', outletId: 'outlet-2' }),
    ];
    strict_1.default.equal((0, reviewCritical_1.getOpenCriticalReviewCount)(reviews), 2);
    strict_1.default.equal((0, reviewCritical_1.getCriticalReviewsEmptyStateMessage)(false), 'No reviews available.');
}
function run() {
    testBackendCriticalQueryExcludesResolvedReviews();
    testFrontendDisplaysOnlyUnresolvedCriticalReviews();
    testResolvedIssuesDoNotAppearAfterCriticalFilterClick();
    testQuickInsightsCountMatchesFilteredList();
    testEmptyStateWhenAllCriticalReviewsAreResolved();
    testRegressionCoverageForExistingReviewBehavior();
    console.log('review-critical-filtering.test.ts: ok');
}
run();
