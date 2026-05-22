import assert from 'node:assert/strict';
import {
  buildTaskCardFooterModel,
  formatTaskAssignedTime,
  getTaskAssignedTimestamp,
  type TaskAssignedTimeSource,
} from '../src/screens/tasks/taskAssignedTime';

function createTask(overrides: Partial<TaskAssignedTimeSource> = {}): TaskAssignedTimeSource {
  return {
    assignedAt: '2026-05-19T10:00:00.000Z',
    createdAt: '2026-05-19T09:00:00.000Z',
    ...overrides,
  };
}

function testAssignedTimeShownOnTaskCards() {
  const model = buildTaskCardFooterModel(createTask(), Date.parse('2026-05-19T12:15:00.000Z'));
  assert.equal(model.assignedTimeLabel, 'Assigned 2h ago');
}

function testAssignedTimePlacementNearAttachments() {
  const model = buildTaskCardFooterModel(createTask(), Date.parse('2026-05-19T12:15:00.000Z'));
  assert.equal(model.assignedTimePlacement, 'trailing');
}

function testRecentAndOlderAssignmentFormatting() {
  assert.equal(
    formatTaskAssignedTime(createTask(), Date.parse('2026-05-19T10:10:00.000Z')),
    'Assigned 10m ago',
  );
  assert.equal(
    formatTaskAssignedTime(createTask(), Date.parse('2026-05-19T12:15:00.000Z')),
    'Assigned 2h ago',
  );
  assert.equal(
    formatTaskAssignedTime(createTask(), Date.parse('2026-05-20T10:00:00.000Z')),
    'Assigned yesterday',
  );

  const olderLabel = formatTaskAssignedTime(
    createTask({ assignedAt: '2026-05-10T10:00:00.000Z' }),
    Date.parse('2026-05-19T12:15:00.000Z'),
  );
  assert.equal(typeof olderLabel, 'string');
  assert.equal(olderLabel?.startsWith('Assigned 10 May,'), true);
}

function testMissingTimestampFallback() {
  assert.equal(
    getTaskAssignedTimestamp(createTask({ assignedAt: undefined, createdAt: undefined })),
    undefined,
  );
  assert.equal(
    formatTaskAssignedTime(
      createTask({ assignedAt: undefined, createdAt: undefined }),
      Date.parse('2026-05-19T12:15:00.000Z'),
    ),
    null,
  );
}

function testRegressionCoverageForCreatedAtFallback() {
  const task = createTask({ assignedAt: undefined, createdAt: '2026-05-19T11:15:00.000Z' });
  assert.equal(getTaskAssignedTimestamp(task), '2026-05-19T11:15:00.000Z');
  assert.equal(
    buildTaskCardFooterModel(task, Date.parse('2026-05-19T12:15:00.000Z')).assignedTimeLabel,
    'Assigned 1h ago',
  );
}

function run() {
  testAssignedTimeShownOnTaskCards();
  testAssignedTimePlacementNearAttachments();
  testRecentAndOlderAssignmentFormatting();
  testMissingTimestampFallback();
  testRegressionCoverageForCreatedAtFallback();
  console.log('task-assigned-time.test.ts: ok');
}

run();
