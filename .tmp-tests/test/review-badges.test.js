"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const reviewBadgeState_1 = require("../src/navigation/reviewBadgeState");
function testNavbarBadgeRendering() {
    const badge = (0, reviewBadgeState_1.getReviewTabBadgeModel)({ unreadCount: 4, pendingCount: 5, hasUnread: true });
    strict_1.default.deepEqual(badge, { visible: true, count: 4 });
}
function testBadgeVisibilityWhenNewReviewsExist() {
    const badge = (0, reviewBadgeState_1.getReviewTabBadgeModel)({ unreadCount: 1, pendingCount: 1, hasUnread: true });
    strict_1.default.equal(badge.visible, true);
    strict_1.default.equal(badge.count, 1);
}
function testBadgeHiddenStateWhenNoNewReviewsExist() {
    const badge = (0, reviewBadgeState_1.getReviewTabBadgeModel)({ unreadCount: 0, pendingCount: 0, hasUnread: false });
    strict_1.default.deepEqual(badge, { visible: false, count: 0 });
}
function testBadgeUpdateAfterReviewViewedOrHandled() {
    const before = (0, reviewBadgeState_1.getReviewTabBadgeModel)({ unreadCount: 2, pendingCount: 2, hasUnread: true });
    const after = (0, reviewBadgeState_1.getReviewTabBadgeModel)({ unreadCount: 0, pendingCount: 1, hasUnread: false });
    strict_1.default.equal(before.visible, true);
    strict_1.default.equal(after.visible, false);
}
function testRegressionCoverageForReviewBadgeModel() {
    const badge = (0, reviewBadgeState_1.getReviewTabBadgeModel)(undefined);
    strict_1.default.deepEqual(badge, { visible: false, count: 0 });
}
function run() {
    testNavbarBadgeRendering();
    testBadgeVisibilityWhenNewReviewsExist();
    testBadgeHiddenStateWhenNoNewReviewsExist();
    testBadgeUpdateAfterReviewViewedOrHandled();
    testRegressionCoverageForReviewBadgeModel();
    console.log('review-badges.test.ts: ok');
}
run();
