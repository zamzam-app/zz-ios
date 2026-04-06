import { useQuery } from '@tanstack/react-query';
import { analyticsApi, Period } from '../api/endpoints/analytics';

export const useQuickInsights = (period: Period) =>
  useQuery({
    queryKey: ['quick-insights', period],
    queryFn: () => analyticsApi.getQuickInsights(period).then((r) => r.data),
  });

export const useGlobalCsat = (period: Period) =>
  useQuery({
    queryKey: ['global-csat', period],
    queryFn: () => analyticsApi.getGlobalCsat(period).then((r) => r.data),
  });

export const useCsatTrendline = (period: Period) =>
  useQuery({
    queryKey: ['csat-trendline', period],
    queryFn: () => analyticsApi.getCsatTrendline(period).then((r) => r.data),
  });

export const useIncidentsOverview = (period: Period) =>
  useQuery({
    queryKey: ['incidents-overview', period],
    queryFn: () => analyticsApi.getIncidentsOverview(period).then((r) => r.data),
  });

export const useOutletFeedbackSummary = (period: Period) =>
  useQuery({
    queryKey: ['outlet-feedback-summary', period],
    queryFn: () => analyticsApi.getOutletFeedbackSummary(period).then((r) => r.data),
  });
