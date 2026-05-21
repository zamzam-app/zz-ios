"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const taskBadges_1 = require("../src/screens/tasks/taskBadges");
function createTask(overrides = {}) {
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
    const badges = (0, taskBadges_1.getTaskBadges)(task);
    strict_1.default.deepEqual(badges.map((badge) => badge.label), ['Hygiene', 'High Priority']);
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
    const badges = (0, taskBadges_1.getTaskBadges)(task);
    strict_1.default.deepEqual(badges.map((badge) => badge.label), ['Weekly', 'Inventory', 'Medium Priority']);
}
function testOldBadgeBehaviorRemoval() {
    const task = createTask({ badges: [{ key: 'category:hygiene', label: 'Hygiene', tone: 'success' }] });
    const badges = (0, taskBadges_1.getTaskBadges)(task);
    strict_1.default.equal(badges.some((badge) => typeof badge.badge === 'string'), false);
}
function testTaskBarRegressionCoverage() {
    const task = createTask({
        badges: [
            { key: 'category:hygiene', label: 'Hygiene', tone: 'success' },
            { key: 'priority', label: 'High Priority', tone: 'warning' },
        ],
    });
    const model = (0, taskBadges_1.buildTaskBarModel)(task);
    strict_1.default.equal(model.title, 'Close the outlet');
    strict_1.default.equal(model.assigneeLabel, 'Manager One');
    strict_1.default.deepEqual(model.badges.map((badge) => badge.label), ['Hygiene', 'High Priority']);
}
function run() {
    testNormalTaskBadgeRendering();
    testRecurringTaskBadgeRendering();
    testOldBadgeBehaviorRemoval();
    testTaskBarRegressionCoverage();
    console.log('task-badges.test.ts: ok');
}
run();
