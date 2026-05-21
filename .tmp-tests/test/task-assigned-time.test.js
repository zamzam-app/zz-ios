"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const taskAssignedTime_1 = require("../src/screens/tasks/taskAssignedTime");
function createTask(overrides = {}) {
    return {
        assignedAt: '2026-05-19T10:00:00.000Z',
        createdAt: '2026-05-19T09:00:00.000Z',
        ...overrides,
    };
}
function testAssignedTimeShownOnTaskCards() {
    const model = (0, taskAssignedTime_1.buildTaskCardFooterModel)(createTask(), Date.parse('2026-05-19T12:15:00.000Z'));
    strict_1.default.equal(model.assignedTimeLabel, 'Assigned 2h ago');
}
function testAssignedTimePlacementNearAttachments() {
    const model = (0, taskAssignedTime_1.buildTaskCardFooterModel)(createTask(), Date.parse('2026-05-19T12:15:00.000Z'));
    strict_1.default.equal(model.assignedTimePlacement, 'trailing');
}
function testRecentAndOlderAssignmentFormatting() {
    strict_1.default.equal((0, taskAssignedTime_1.formatTaskAssignedTime)(createTask(), Date.parse('2026-05-19T10:10:00.000Z')), 'Assigned 10m ago');
    strict_1.default.equal((0, taskAssignedTime_1.formatTaskAssignedTime)(createTask(), Date.parse('2026-05-19T12:15:00.000Z')), 'Assigned 2h ago');
    strict_1.default.equal((0, taskAssignedTime_1.formatTaskAssignedTime)(createTask(), Date.parse('2026-05-20T10:00:00.000Z')), 'Assigned yesterday');
    const olderLabel = (0, taskAssignedTime_1.formatTaskAssignedTime)(createTask({ assignedAt: '2026-05-10T10:00:00.000Z' }), Date.parse('2026-05-19T12:15:00.000Z'));
    strict_1.default.equal(typeof olderLabel, 'string');
    strict_1.default.equal(olderLabel?.startsWith('Assigned 10 May,'), true);
}
function testMissingTimestampFallback() {
    strict_1.default.equal((0, taskAssignedTime_1.getTaskAssignedTimestamp)(createTask({ assignedAt: undefined, createdAt: undefined })), undefined);
    strict_1.default.equal((0, taskAssignedTime_1.formatTaskAssignedTime)(createTask({ assignedAt: undefined, createdAt: undefined }), Date.parse('2026-05-19T12:15:00.000Z')), null);
}
function testRegressionCoverageForCreatedAtFallback() {
    const task = createTask({ assignedAt: undefined, createdAt: '2026-05-19T11:15:00.000Z' });
    strict_1.default.equal((0, taskAssignedTime_1.getTaskAssignedTimestamp)(task), '2026-05-19T11:15:00.000Z');
    strict_1.default.equal((0, taskAssignedTime_1.buildTaskCardFooterModel)(task, Date.parse('2026-05-19T12:15:00.000Z')).assignedTimeLabel, 'Assigned 1h ago');
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
