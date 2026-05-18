"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewTabBadgeModel = getReviewTabBadgeModel;
function getReviewTabBadgeModel(status) {
    const count = Math.max(0, status?.unreadCount ?? 0);
    return {
        visible: count > 0,
        count,
    };
}
