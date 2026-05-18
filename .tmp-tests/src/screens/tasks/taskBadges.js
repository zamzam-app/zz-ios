"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskBadgeStyles = void 0;
exports.getTaskBadges = getTaskBadges;
exports.getTaskBadgeStyle = getTaskBadgeStyle;
exports.buildTaskBarModel = buildTaskBarModel;
const theme_1 = require("../../theme/theme");
const BADGE_TONE_STYLES = {
    neutral: {
        backgroundColor: '#EEF1F4',
        borderColor: '#D4DBE2',
        textColor: theme_1.colors.textSecondary,
    },
    info: {
        backgroundColor: '#E6F0FF',
        borderColor: '#B8D2FF',
        textColor: '#1D4ED8',
    },
    success: {
        backgroundColor: '#DDF6E9',
        borderColor: '#8ED3AE',
        textColor: '#1C7A52',
    },
    warning: {
        backgroundColor: '#FFF1DE',
        borderColor: '#F7C992',
        textColor: '#B45309',
    },
    danger: {
        backgroundColor: '#FEE2E2',
        borderColor: '#F5B5B5',
        textColor: '#B91C1C',
    },
};
exports.taskBadgeStyles = {
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: theme_1.spacing.xs,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: theme_1.radius.full,
        borderWidth: 1,
    },
    label: {
        fontSize: theme_1.typography.xs,
        fontWeight: theme_1.typography.semibold,
    },
};
function fallbackBadges(task) {
    const badges = [];
    const categoryName = task.taskCategory?.name ?? task.category;
    if (task.isRecurring) {
        badges.push({
            key: 'schedule',
            label: task.recurrenceType === 'MONTHLY'
                ? 'Monthly'
                : task.recurrenceType === 'WEEKLY'
                    ? 'Weekly'
                    : 'Recurring',
            tone: 'info',
        });
    }
    if (categoryName) {
        badges.push({ key: `category:${categoryName.toLowerCase()}`, label: categoryName, tone: 'success' });
    }
    if (task.priority === 'HIGH') {
        badges.push({ key: 'priority', label: 'High Priority', tone: 'warning' });
    }
    else if (task.priority === 'LOW') {
        badges.push({ key: 'priority', label: 'Low Priority', tone: 'neutral' });
    }
    else {
        badges.push({ key: 'priority', label: 'Medium Priority', tone: 'info' });
    }
    return badges;
}
function getTaskBadges(task) {
    const source = Array.isArray(task.badges) && task.badges.length > 0 ? task.badges : fallbackBadges(task);
    const seen = new Set();
    return source.filter((badge) => {
        if (!badge || typeof badge.label !== 'string' || !badge.label.trim())
            return false;
        const key = typeof badge.key === 'string' && badge.key.trim() ? badge.key : badge.label.trim().toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function getTaskBadgeStyle(tone) {
    return BADGE_TONE_STYLES[tone] ?? BADGE_TONE_STYLES.neutral;
}
function buildTaskBarModel(task) {
    const assigneeLabel = task.assigneeNames && task.assigneeNames.length > 0
        ? task.assigneeNames.join(', ')
        : (task.assignees ?? [])
            .map((assignee) => assignee.name)
            .filter((name) => Boolean(name))
            .join(', ') || 'Unassigned';
    return {
        title: task.title || task.description,
        badges: getTaskBadges(task),
        assigneeLabel,
    };
}
