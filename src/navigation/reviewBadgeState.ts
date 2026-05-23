export type ReviewBadgeSnapshot =
  | {
      unreadCount?: number;
      pendingCount?: number;
      hasUnread?: boolean;
    }
  | null
  | undefined;

export interface ReviewTabBadgeModel {
  visible: boolean;
  count: number;
}

export function getReviewTabBadgeModel(status: ReviewBadgeSnapshot): ReviewTabBadgeModel {
  const count = Math.max(0, status?.unreadCount ?? 0);
  return {
    visible: count > 0,
    count,
  };
}
