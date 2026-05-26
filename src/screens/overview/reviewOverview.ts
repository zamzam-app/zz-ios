import type { OutletFeedbackItem } from '../../api/endpoints/analytics';
import type { Outlet } from '../../api/endpoints/outlets';

export interface OverviewOutletCount {
  name: string;
  value: number;
}

export interface OpenReviewOverviewModel {
  criticalItems: OverviewOutletCount[];
  openItems: OverviewOutletCount[];
  resolvedItems: OverviewOutletCount[];
  hasOpenReviews: boolean;
}

interface OutletFeedbackCountSource {
  outletId: string;
  outletName: string;
  negativeFeedbacks: number;
  totalFeedbacks: number;
  resolvedFeedbacks: number;
}

function toSortedCounts(
  items: OutletFeedbackCountSource[],
  selector: (item: OutletFeedbackCountSource) => number,
  includeZeroRows: boolean,
) {
  return items
    .map((item) => ({ name: item.outletName, value: selector(item) }))
    .filter((item) => includeZeroRows || item.value > 0)
    .sort((first, second) => {
      if (second.value !== first.value) return second.value - first.value;
      return first.name.localeCompare(second.name);
    });
}

export function buildOpenReviewOverviewModel(
  items: OutletFeedbackItem[] | undefined,
  outlets: Outlet[] | undefined = undefined,
): OpenReviewOverviewModel {
  const feedbackByOutletId = new Map((items ?? []).map((item) => [item.outletId, item]));
  const sourceByOutletId = new Map<string, OutletFeedbackCountSource>();

  for (const outlet of outlets ?? []) {
    const feedback = feedbackByOutletId.get(outlet.id);
    sourceByOutletId.set(outlet.id, {
      outletId: outlet.id,
      outletName: outlet.name,
      negativeFeedbacks: feedback?.negativeFeedbacks ?? 0,
      totalFeedbacks: feedback?.totalFeedbacks ?? 0,
      resolvedFeedbacks: feedback?.resolvedFeedbacks ?? 0,
    });
  }

  for (const item of items ?? []) {
    if (sourceByOutletId.has(item.outletId)) continue;
    sourceByOutletId.set(item.outletId, item);
  }

  const includeZeroRows = Boolean(outlets?.length);
  const source = Array.from(sourceByOutletId.values());
  const criticalItems = toSortedCounts(
    source,
    (item) => item.negativeFeedbacks ?? 0,
    includeZeroRows,
  );
  const openItems = toSortedCounts(source, (item) => item.totalFeedbacks ?? 0, includeZeroRows);
  const resolvedItems = toSortedCounts(
    source,
    (item) => item.resolvedFeedbacks ?? 0,
    includeZeroRows,
  );

  return {
    criticalItems,
    openItems,
    resolvedItems,
    hasOpenReviews: source.some(
      (item) => (item.negativeFeedbacks ?? 0) > 0 || (item.totalFeedbacks ?? 0) > 0,
    ),
  };
}

export function getOpenReviewsEmptyStateMessage() {
  return 'No open reviews for this time filter.';
}
