import client from '../client';

export type Period = 'daily' | 'weekly' | 'monthly';

export interface QuickInsightsResponse {
  peakIncidentTime: {
    label: string;
    startTime: string;
    endTime: string;
    timeZone: string;
    totalIncidents: number;
  } | null;
  mostImprovedOutlet: {
    outletId: string;
    outletName: string;
    improvement: number;
    currentAverage: number;
    previousAverage: number;
  } | null;
  criticalFocusArea: {
    outletId: string;
    outletName: string;
    criticalIssues: number;
  } | null;
  period: Period;
  startDate: string;
  endDate: string;
}

export interface GlobalCsatResponse {
  globalCsatScore: number;
  averageOverallRating: number;
  totalRatings: number;
  totalScore: number;
  period?: Period;
  startDate?: string;
  endDate?: string;
}

export interface CsatTrendlineResponse {
  period: Period;
  currentPeriod: {
    startDate: string;
    endDate: string;
    labels: string[];
    values: number[];
    totalRatings: number;
  };
  previousPeriod: {
    startDate: string;
    endDate: string;
    labels: string[];
    values: number[];
    totalRatings: number;
  };
}

export interface IncidentsOverviewResponse {
  totalOpenIncidents: number;
  criticalIssues: number;
  incidentsResolvedToday: number;
  resolvedTodayDate: string;
  period?: Period;
  startDate?: string;
  endDate?: string;
}

export interface OutletFeedbackItem {
  outletId: string;
  outletName: string;
  negativeFeedbacks: number;
  totalFeedbacks: number;
  resolvedFeedbacks: number;
}

export interface OutletFeedbackSummaryResponse {
  items: OutletFeedbackItem[];
  period: Period;
  startDate: string;
  endDate: string;
}

export const analyticsApi = {
  getQuickInsights: (period: Period) =>
    client.get<QuickInsightsResponse>('/analytics/quick-insights', { params: { period } }),

  getGlobalCsat: (period: Period) =>
    client.get<GlobalCsatResponse>('/analytics/global-csat', { params: { period } }),

  getCsatTrendline: (period: Period) =>
    client.get<CsatTrendlineResponse>('/analytics/csat-trendline', { params: { period } }),

  getIncidentsOverview: (period: Period) =>
    client.get<IncidentsOverviewResponse>('/analytics/incidents-overview', { params: { period } }),

  getOutletFeedbackSummary: (period: Period) =>
    client.get<OutletFeedbackSummaryResponse>('/analytics/outlet-feedback-summary', { params: { period } }),
};
