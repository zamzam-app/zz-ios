import { useQuery } from '@tanstack/react-query';
import { analyticsApi, Period } from '../api/endpoints/analytics';

const ANALYTICS_STALE_TIME_MS = 60_000;

export const useQuickInsights = (period: Period) =>
  useQuery({
    queryKey: ['quick-insights', period],
    queryFn: () => analyticsApi.getQuickInsights(period).then((r) => r.data),
    staleTime: ANALYTICS_STALE_TIME_MS,
  });

export const useGlobalCsat = (period: Period) =>
  useQuery({
    queryKey: ['global-csat', period],
    queryFn: () => analyticsApi.getGlobalCsat(period).then((r) => r.data),
    staleTime: ANALYTICS_STALE_TIME_MS,
  });

export const useCsatTrendline = (period: Period) =>
  useQuery({
    queryKey: ['csat-trendline', period],
    queryFn: () => analyticsApi.getCsatTrendline(period).then((r) => r.data),
    staleTime: ANALYTICS_STALE_TIME_MS,
  });

export const useIncidentsOverview = (period: Period) =>
  useQuery({
    queryKey: ['incidents-overview', period],
    queryFn: () => analyticsApi.getIncidentsOverview(period).then((r) => r.data),
    staleTime: ANALYTICS_STALE_TIME_MS,
  });

export const useOutletFeedbackSummary = (period: Period) =>
  useQuery({
    queryKey: ['outlet-feedback-summary', period],
    queryFn: () => analyticsApi.getOutletFeedbackSummary(period).then((r) => r.data),
    staleTime: ANALYTICS_STALE_TIME_MS,
  });

export const useFranchiseAnalytics = (period: Period) =>
  useQuery({
    queryKey: ['franchise-analytics', period],
    queryFn: () => analyticsApi.getFranchiseAnalytics(period).then((r) => r.data),
    staleTime: ANALYTICS_STALE_TIME_MS,
  });
