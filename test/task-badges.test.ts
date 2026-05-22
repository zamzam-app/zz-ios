import assert from 'node:assert/strict';
import {
  buildTaskBarModel,
  getTaskBadges,
  type TaskBadgeTask,
} from '../src/screens/tasks/taskBadges';

function createTask(overrides: Partial<TaskBadgeTask> = {}): TaskBadgeTask {
  return {
    id: 'task-1',
    description: 'Close the outlet',
    title: 'Close the outlet',
    status: 'OPEN',
    priority: 'HIGH',
    dueDate: '2026-05-18T00:00:00.000Z',
    dueTime: '14:30',
    assigneeIds: ['manager-1'],
    assigneeNames: ['Manager One'],
    isRecurring: false,
    createdAt: '2026-05-18T08:00:00.000Z',
    badges: [
      { key: 'category:hygiene', label: 'Hygiene', tone: 'success' },
      { key: 'priority', label: 'High Priority', tone: 'warning' },
    ],
    ...overrides,
  };
}

function testNormalTaskBadgeRendering() {
  const task = createTask();
  const badges = getTaskBadges(task);
  assert.deepEqual(
    badges.map((badge) => badge.label),
    ['Hygiene', 'High Priority'],
  );
}

function testRecurringTaskBadgeRendering() {
  const task = createTask({
    isRecurring: true,
    recurrenceType: 'WEEKLY',
    badges: [
      { key: 'schedule', label: 'Weekly', tone: 'info' },
      { key: 'category:inventory', label: 'Inventory', tone: 'success' },
      { key: 'priority', label: 'Medium Priority', tone: 'info' },
    ],
    priority: 'MEDIUM',
  });

  const badges = getTaskBadges(task);
  assert.deepEqual(
    badges.map((badge) => badge.label),
    ['Weekly', 'Inventory', 'Medium Priority'],
  );
}

function testOldBadgeBehaviorRemoval() {
  const task = createTask({
    badges: [{ key: 'category:hygiene', label: 'Hygiene', tone: 'success' }],
  });
  const badges = getTaskBadges(task) as Array<{ badge?: string }>;
  assert.equal(
    badges.some((badge) => typeof badge.badge === 'string'),
    false,
  );
}

function testTaskBarRegressionCoverage() {
  const task = createTask({
    badges: [
      { key: 'category:hygiene', label: 'Hygiene', tone: 'success' },
      { key: 'priority', label: 'High Priority', tone: 'warning' },
    ],
  });

  const model = buildTaskBarModel(task);
  assert.equal(model.title, 'Close the outlet');
  assert.equal(model.assigneeLabel, 'Manager One');
  assert.deepEqual(
    model.badges.map((badge) => badge.label),
    ['Hygiene', 'High Priority'],
  );
}

function run() {
  testNormalTaskBadgeRendering();
  testRecurringTaskBadgeRendering();
  testOldBadgeBehaviorRemoval();
  testTaskBarRegressionCoverage();
  console.log('task-badges.test.ts: ok');
}

run();
