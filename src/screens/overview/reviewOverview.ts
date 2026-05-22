import type { OutletFeedbackItem } from '../../api/endpoints/analytics';

export interface OverviewOutletCount {
  name: string;
  value: number;
}

export interface OpenReviewOverviewModel {
  criticalItems: OverviewOutletCount[];
  openItems: OverviewOutletCount[];
  hasOpenReviews: boolean;
}

function toSortedCounts(
  items: OutletFeedbackItem[],
  selector: (item: OutletFeedbackItem) => number,
): OverviewOutletCount[] {
  return items
    .map((item) => ({
      name: item.outletName,
      value: selector(item),
    }))
    .filter((item) => item.value > 0)
    .sort((first, second) => {
      if (second.value !== first.value) return second.value - first.value;
      return first.name.localeCompare(second.name);
    });
}

export function buildOpenReviewOverviewModel(
  items: OutletFeedbackItem[] | undefined,
): OpenReviewOverviewModel {
  const source = items ?? [];
  const criticalItems = toSortedCounts(source, (item) => item.negativeFeedbacks ?? 0);
  const openItems = toSortedCounts(source, (item) => item.totalFeedbacks ?? 0);

  return {
    criticalItems,
    openItems,
    hasOpenReviews: criticalItems.length > 0 || openItems.length > 0,
  };
}

export function getOpenReviewsEmptyStateMessage() {
  return 'No open reviews for this time filter.';
}
