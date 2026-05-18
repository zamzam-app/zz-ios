import { TaskFilterSource } from './taskFilters';

export type ReviewMetricFilter = 'all' | 'open' | 'resolved';
export type ReviewTypeFilter = 'all' | 'open' | 'resolved' | 'critical' | 'concern';
export type ReviewFilterSource = TaskFilterSource;

export interface ReviewFilterParams {
  metric?: ReviewMetricFilter;
  typeFilter?: ReviewTypeFilter;
  source?: ReviewFilterSource;
  nonce?: number;
}
