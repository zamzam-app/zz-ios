import { Task } from '../../api/endpoints/tasks';
import type { TaskSummary } from '../../types/task';

type TaskLike = Task | TaskSummary;

function isLegacyTask(task: TaskLike): task is Task {
  return 'taskCategory' in task || 'outlet' in task;
}

export function getTaskCategoryName(task: TaskLike): string | undefined {
  if (isLegacyTask(task)) {
    return task.taskCategory?.name ?? task.category;
  }
  return undefined;
}

export function getTaskOutletName(task: TaskLike): string | undefined {
  if (isLegacyTask(task)) {
    return task.outlet?.name ?? task.outletName;
  }
  return undefined;
}

export function getTaskAssigneeNames(task: TaskLike): string[] {
  if (isLegacyTask(task)) {
    if (task.assigneeNames && task.assigneeNames.length > 0) {
      return task.assigneeNames;
    }
    return (task.assignees ?? [])
      .map((assignee) => assignee.name)
      .filter((name): name is string => Boolean(name));
  }
  return [];
}
