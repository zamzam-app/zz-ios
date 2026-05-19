import assert from 'node:assert/strict';
import {
  buildOpenReviewOverviewModel,
  getOpenReviewsEmptyStateMessage,
} from '../src/screens/overview/reviewOverview';

function testOpenOverviewUsesOnlyOpenReviewCounts() {
  const model = buildOpenReviewOverviewModel([
    {
      outletId: '1',
      outletName: 'Outlet A',
      negativeFeedbacks: 2,
      totalFeedbacks: 5,
      resolvedFeedbacks: 4,
    },
    {
      outletId: '2',
      outletName: 'Outlet B',
      negativeFeedbacks: 0,
      totalFeedbacks: 1,
      resolvedFeedbacks: 9,
    },
  ]);

  assert.deepEqual(model.criticalItems, [{ name: 'Outlet A', value: 2 }]);
  assert.deepEqual(model.openItems, [
    { name: 'Outlet A', value: 5 },
    { name: 'Outlet B', value: 1 },
  ]);
  assert.equal(model.hasOpenReviews, true);
}

function testEmptyStateWhenNoOpenReviewsExist() {
  const model = buildOpenReviewOverviewModel([
    {
      outletId: '1',
      outletName: 'Outlet A',
      negativeFeedbacks: 0,
      totalFeedbacks: 0,
      resolvedFeedbacks: 3,
    },
  ]);

  assert.equal(model.hasOpenReviews, false);
  assert.deepEqual(model.criticalItems, []);
  assert.deepEqual(model.openItems, []);
  assert.equal(getOpenReviewsEmptyStateMessage(), 'No open reviews for this time filter.');
}

function testRegressionSortingIsStable() {
  const model = buildOpenReviewOverviewModel([
    {
      outletId: '2',
      outletName: 'Bravo',
      negativeFeedbacks: 1,
      totalFeedbacks: 1,
      resolvedFeedbacks: 0,
    },
    {
      outletId: '1',
      outletName: 'Alpha',
      negativeFeedbacks: 1,
      totalFeedbacks: 1,
      resolvedFeedbacks: 0,
    },
  ]);

  assert.deepEqual(model.criticalItems, [
    { name: 'Alpha', value: 1 },
    { name: 'Bravo', value: 1 },
  ]);
}

function run() {
  testOpenOverviewUsesOnlyOpenReviewCounts();
  testEmptyStateWhenNoOpenReviewsExist();
  testRegressionSortingIsStable();
  console.log('review-overview.test.ts: ok');
}

run();
