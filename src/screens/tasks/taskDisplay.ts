import { Task } from '../../api/endpoints/tasks';
import type { TaskSummary, SerializedTimelineEvent } from '../../types/task';

type TaskLike = Task | TaskSummary;

function isLegacyTask(task: TaskLike): task is Task {
  return 'taskCategory' in task || 'outlet' in task;
}

export function getTaskCategoryName(task: TaskLike, legacyTask?: Task): string | undefined {
  const t = legacyTask || (isLegacyTask(task) ? task : undefined);
  if (t) {
    return t.taskCategory?.name ?? t.category;
  }
  return undefined;
}

export function getTaskOutletName(task: TaskLike, legacyTask?: Task): string | undefined {
  const t = legacyTask || (isLegacyTask(task) ? task : undefined);
  if (t) {
    return t.outlet?.name ?? t.outletName;
  }
  return undefined;
}

export function getTaskAssigneeNames(task: TaskLike, legacyTask?: Task, events?: SerializedTimelineEvent[]): string[] {
  const namesSet = new Set<string>();

  // 1. If it has a populated activeOwner object (TaskSummary), add its name
  const activeOwnerObj = (task as any).activeOwner;
  if (activeOwnerObj && typeof activeOwnerObj === 'object' && typeof activeOwnerObj.name === 'string') {
    namesSet.add(activeOwnerObj.name);
  }

  // 2. Add assignees from legacyTask or from task if it's a legacy task
  const t = legacyTask || (isLegacyTask(task) ? task : undefined);
  if (t) {
    if (t.assigneeNames && t.assigneeNames.length > 0) {
      t.assigneeNames.forEach((n) => namesSet.add(n));
    } else if (Array.isArray(t.assignees)) {
      t.assignees
        .map((a) => a.name)
        .filter((n): n is string => Boolean(n))
        .forEach((n) => namesSet.add(n));
    }
  }

  // 3. Scan timeline events for historically delegated managers
  if (Array.isArray(events)) {
    for (const event of events) {
      if (event.type === 'REASSIGNED') {
        const name = event.delegationSummary?.delegatedTo?.name;
        if (name && typeof name === 'string') {
          namesSet.add(name);
        }
      }
    }
  }

  return Array.from(namesSet);
}
