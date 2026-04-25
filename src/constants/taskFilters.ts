export type TaskMetricFilter = 'all' | 'open' | 'critical' | 'resolved' | 'due_today';

export type TaskFilterSource =
  | 'overview_reviews_metric'
  | 'overview_tasks_metric';

export interface TaskFilterParams {
  metric: TaskMetricFilter;
  source?: TaskFilterSource;
  nonce?: number;
}

export const TASK_FILTER_PARAM_KEYS = {
  metric: 'metric',
  source: 'source',
  nonce: 'nonce',
} as const;

export const TASK_METRIC_FILTER_LABELS: Record<TaskMetricFilter, string> = {
  all: 'All tasks',
  open: 'Open',
  critical: 'Critical',
  resolved: 'Resolved',
  due_today: 'Due today',
};
