import { colors, radius, spacing, typography } from '../../theme/theme';

export type TaskBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface TaskBadge {
  key: string;
  label: string;
  tone: TaskBadgeTone;
}

export interface TaskBadgeStyle {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

const BADGE_TONE_STYLES: Record<TaskBadgeTone, TaskBadgeStyle> = {
  neutral: {
    backgroundColor: '#EEF1F4',
    borderColor: '#D4DBE2',
    textColor: colors.textSecondary,
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
    backgroundColor: '#FEE2E2',
    borderColor: '#F5B5B5',
    textColor: '#B91C1C',
  },
  danger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F5B5B5',
    textColor: '#B91C1C',
  },
};

export const taskBadgeStyles = {
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  } as const,
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  } as const,
  label: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  } as const,
};

export interface TaskBadgeTask {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  id?: string;
  title?: string;
  description: string;
  dueDate?: string;
  dueTime?: string;
  createdAt?: string;
  category?: string;
  taskCategory?: { _id?: string; name?: string; description?: string };
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assigneeNames?: string[];
  assignees?: { _id?: string; name?: string }[];
  isRecurring?: boolean;
  recurrenceType?: 'WEEKLY' | 'MONTHLY';
  badges?: TaskBadge[];
}

function fallbackBadges(task: TaskBadgeTask): TaskBadge[] {
  const badges: TaskBadge[] = [];
  const categoryName = task.taskCategory?.name ?? task.category;

  if (task.isRecurring) {
    badges.push({
      key: 'schedule',
      label:
        task.recurrenceType === 'MONTHLY'
          ? 'Monthly'
          : task.recurrenceType === 'WEEKLY'
            ? 'Weekly'
            : 'Recurring',
      tone: 'info',
    });
  }

  if (categoryName) {
    badges.push({
      key: `category:${categoryName.toLowerCase()}`,
      label: categoryName,
      tone: 'success',
    });
  }

  if (task.priority === 'HIGH') {
    badges.push({ key: 'priority', label: 'High Priority', tone: 'warning' });
  } else if (task.priority === 'LOW') {
    badges.push({ key: 'priority', label: 'Low Priority', tone: 'neutral' });
  } else {
    badges.push({ key: 'priority', label: 'Medium Priority', tone: 'info' });
  }

  return badges;
}

export function getTaskBadges(task: TaskBadgeTask): TaskBadge[] {
  const source =
    Array.isArray(task.badges) && task.badges.length > 0 ? task.badges : fallbackBadges(task);
  const seen = new Set<string>();

  return source.filter((badge): badge is TaskBadge => {
    if (!badge || typeof badge.label !== 'string' || !badge.label.trim()) return false;
    const key =
      typeof badge.key === 'string' && badge.key.trim()
        ? badge.key
        : badge.label.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getTaskBadgeStyle(tone: TaskBadgeTone): TaskBadgeStyle {
  return BADGE_TONE_STYLES[tone] ?? BADGE_TONE_STYLES.neutral;
}

export function buildTaskBarModel(task: TaskBadgeTask) {
  const assigneeLabel =
    task.assigneeNames && task.assigneeNames.length > 0
      ? task.assigneeNames.join(', ')
      : (task.assignees ?? [])
          .map((assignee) => assignee.name)
          .filter((name): name is string => Boolean(name))
          .join(', ') || 'Unassigned';

  return {
    title: task.title || task.description,
    badges: getTaskBadges(task),
    assigneeLabel,
  };
}
