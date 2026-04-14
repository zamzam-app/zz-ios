import { Task } from '../../api/endpoints/tasks';

export function getTaskCategoryName(task: Task): string | undefined {
  return task.taskCategory?.name ?? task.category;
}

export function getTaskOutletName(task: Task): string | undefined {
  return task.outlet?.name ?? task.outletName;
}

export function getTaskAssigneeNames(task: Task): string[] {
  if (task.assigneeNames && task.assigneeNames.length > 0) {
    return task.assigneeNames;
  }
  return (task.assignees ?? [])
    .map((assignee) => assignee.name)
    .filter((name): name is string => Boolean(name));
}
