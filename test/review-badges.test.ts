import assert from 'node:assert/strict';

import { getReviewTabBadgeModel } from '../src/navigation/reviewBadgeState';

function testNavbarBadgeRendering() {
  const badge = getReviewTabBadgeModel({ unreadCount: 4, pendingCount: 5, hasUnread: true });
  assert.deepEqual(badge, { visible: true, count: 4 });
}

function testBadgeVisibilityWhenNewReviewsExist() {
  const badge = getReviewTabBadgeModel({ unreadCount: 1, pendingCount: 1, hasUnread: true });
  assert.equal(badge.visible, true);
  assert.equal(badge.count, 1);
}

function testBadgeHiddenStateWhenNoNewReviewsExist() {
  const badge = getReviewTabBadgeModel({ unreadCount: 0, pendingCount: 0, hasUnread: false });
  assert.deepEqual(badge, { visible: false, count: 0 });
}

function testBadgeUpdateAfterReviewViewedOrHandled() {
  const before = getReviewTabBadgeModel({ unreadCount: 2, pendingCount: 2, hasUnread: true });
  const after = getReviewTabBadgeModel({ unreadCount: 0, pendingCount: 1, hasUnread: false });
  assert.equal(before.visible, true);
  assert.equal(after.visible, false);
}

function testRegressionCoverageForReviewBadgeModel() {
  const badge = getReviewTabBadgeModel(undefined);
  assert.deepEqual(badge, { visible: false, count: 0 });
}

function run() {
  testNavbarBadgeRendering();
  testBadgeVisibilityWhenNewReviewsExist();
  testBadgeHiddenStateWhenNoNewReviewsExist();
  testBadgeUpdateAfterReviewViewedOrHandled();
  testRegressionCoverageForReviewBadgeModel();
}

run();
