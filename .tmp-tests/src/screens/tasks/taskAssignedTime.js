"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTaskAssignedTimestamp = getTaskAssignedTimestamp;
exports.formatTaskAssignedTime = formatTaskAssignedTime;
exports.buildTaskCardFooterModel = buildTaskCardFooterModel;
function parseIsoTimestamp(value) {
    if (!value)
        return null;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
}
function isYesterday(timestamp, nowTimestamp) {
    const now = new Date(nowTimestamp);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
    return timestamp >= yesterdayStart && timestamp < todayStart;
}
function formatOlderAssignment(timestamp, nowTimestamp) {
    const value = new Date(timestamp);
    const now = new Date(nowTimestamp);
    const sameYear = value.getFullYear() === now.getFullYear();
    const dateText = value.toLocaleDateString('en-GB', sameYear
        ? { day: 'numeric', month: 'short' }
        : { day: 'numeric', month: 'short', year: 'numeric' });
    const timeText = value.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
    return `Assigned ${dateText}, ${timeText}`;
}
function getTaskAssignedTimestamp(task) {
    return task.assignedAt ?? task.createdAt;
}
function formatTaskAssignedTime(task, nowTimestamp = Date.now()) {
    const assignedTimestamp = parseIsoTimestamp(getTaskAssignedTimestamp(task));
    if (assignedTimestamp === null)
        return null;
    const diffMs = Math.max(0, nowTimestamp - assignedTimestamp);
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1)
        return 'Assigned just now';
    if (minutes < 60)
        return `Assigned ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `Assigned ${hours}h ago`;
    if (isYesterday(assignedTimestamp, nowTimestamp))
        return 'Assigned yesterday';
    return formatOlderAssignment(assignedTimestamp, nowTimestamp);
}
function buildTaskCardFooterModel(task, nowTimestamp = Date.now()) {
    return {
        assignedTimeLabel: formatTaskAssignedTime(task, nowTimestamp),
        assignedTimePlacement: 'trailing',
    };
}
