import { TaskFilterSource } from './taskFilters';

export type ReviewMetricFilter = 'all' | 'open' | 'resolved';
export type ReviewFilterSource = TaskFilterSource;

export interface ReviewFilterParams {
  metric: ReviewMetricFilter;
  source?: ReviewFilterSource;
  nonce?: number;
}
