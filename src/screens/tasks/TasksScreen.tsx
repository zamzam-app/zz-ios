import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTasks } from '../../hooks/useTasks';
import { Task, TaskPriority } from '../../api/endpoints/tasks';
import StatusBadge from '../../components/StatusBadge';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TasksList'>;
type PriorityFilter = TaskPriority | 'ALL';

const PRIORITY_FILTERS: Array<{ label: string; value: PriorityFilter }> = [
  { label: 'All Tasks', value: 'ALL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: colors.priorityHigh,
  MEDIUM: colors.priorityMedium,
  LOW: colors.priorityLow,
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No due date';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatRelativeTime(iso?: string | null) {
  if (!iso) return 'Closed';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Closed';

  const diffMs = Date.now() - date.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `Closed ${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Closed ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `Closed ${days}d ago`;
}

function OpenTaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const isOverdue = task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();
  const outletName = getTaskOutletName(task);
  const categoryName = getTaskCategoryName(task);
  const assigneeNames = getTaskAssigneeNames(task);
  const priorityColor = PRIORITY_COLORS[task.priority] ?? colors.textSecondary;

  return (
    <TouchableOpacity style={styles.openCard} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.openCardInner}>
        <View style={styles.openCardHeader}>
          <StatusBadge status={task.status} />
          <Text style={[styles.dueDate, isOverdue && { color: colors.error }]}>
            {formatDate(task.dueDate)}
          </Text>
        </View>

        <Text style={styles.openTitle} numberOfLines={1}>
          {task.title || task.description}
        </Text>
        {outletName ? <Text style={styles.outletName}>{outletName}</Text> : null}
        <Text style={styles.description} numberOfLines={2}>{task.description}</Text>

        <View style={styles.openCardFooter}>
          {categoryName ? (
            <View style={styles.metaPill}>
              <Text style={styles.categoryText}>{categoryName}</Text>
            </View>
          ) : null}
          {assigneeNames.length > 0 && (
            <Text style={styles.assignees} numberOfLines={1}>{assigneeNames.join(', ')}</Text>
          )}
          <View style={styles.footerSpacer} />
          <Text style={[styles.priorityLabel, { color: priorityColor }]}>{task.priority}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CompletedTaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const assigneeNames = getTaskAssigneeNames(task);
  const priorityColor = PRIORITY_COLORS[task.priority] ?? colors.textSecondary;
  const categoryName = getTaskCategoryName(task);

  return (
    <TouchableOpacity style={styles.completedCard} onPress={onPress} activeOpacity={0.78}>
      <View style={styles.completedMeta}>
        <Text style={styles.completedId}>ID: #{task.id.slice(-4).toUpperCase()}</Text>
        <Text style={styles.completedWhen}>{formatRelativeTime(task.completedAt)}</Text>
      </View>

      <Text style={styles.completedTitle} numberOfLines={1}>
        {task.title || task.description}
      </Text>
      <Text style={styles.completedDescription} numberOfLines={2}>
        {task.description}
      </Text>

      <View style={styles.completedFooter}>
        <Text style={styles.completedAssignee} numberOfLines={1}>
          {assigneeNames[0] ?? 'System'}
        </Text>
        {categoryName ? <Text style={styles.completedCategory}>{categoryName}</Text> : null}
        <View style={styles.footerSpacer} />
        <Text style={[styles.completedPriority, { color: priorityColor }]}>{task.priority}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const navigation = useNavigation<Nav>();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');

  const { data: tasks, isLoading, isFetching, refetch } = useTasks({ limit: 50 });
  const allTasks = tasks ?? [];

  const filteredTasks = useMemo(
    () => (priorityFilter === 'ALL'
      ? allTasks
      : allTasks.filter((task) => task.priority === priorityFilter)),
    [allTasks, priorityFilter],
  );

  const openTasks = filteredTasks.filter((task) => task.status !== 'COMPLETED');
  const completedTasks = filteredTasks.filter((task) => task.status === 'COMPLETED');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Task Board</Text>
          <Text style={styles.subheading}>Manage operational flows across all outlets</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateTask')} activeOpacity={0.84}>
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.priorityRow}
        style={styles.priorityRowScroll}
      >
        {PRIORITY_FILTERS.map((option) => {
          const active = option.value === priorityFilter;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.priorityPill, active && styles.priorityPillActive]}
              onPress={() => setPriorityFilter(option.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.priorityPillText, active && styles.priorityPillTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.sectionsContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingWrap}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Open Tasks</Text>
          </View>
          <Text style={styles.sectionCount}>{openTasks.length} active</Text>
        </View>

        <FlatList
          style={styles.openList}
          data={openTasks}
          keyExtractor={(task) => task.id}
          contentContainerStyle={
            openTasks.length > 0 ? styles.openListContent : styles.openListEmptyContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <View style={styles.openCardWrap}>
              <OpenTaskCard
                task={item}
                onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
              />
            </View>
          )}
          ListEmptyComponent={(
            isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.empty}>No open tasks found</Text>
              </View>
            )
          )}
        />

        <View style={styles.completedSection}>
          <View style={styles.completedSectionHeader}>
            <View style={styles.sectionHeadingWrap}>
              <View style={[styles.sectionDot, styles.sectionDotCompleted]} />
              <Text style={styles.sectionTitle}>Completed Tasks</Text>
            </View>
          </View>

          {!isLoading && completedTasks.length === 0 && (
            <Text style={styles.completedEmpty}>No completed tasks yet</Text>
          )}

          {isLoading && (
            <View style={styles.completedLoadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {!isLoading && completedTasks.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.completedRow}>
              {completedTasks.map((task) => (
                <CompletedTaskCard
                  key={task.id}
                  task={task}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F9FB' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  heading: {
    fontSize: 26,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  createBtn: {
    backgroundColor: '#785A00',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },

  priorityRowScroll: {
    flexGrow: 0,
    minHeight: 48,
  },
  priorityRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  priorityPill: {
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priorityPillActive: {
    backgroundColor: '#FFDF9A',
    borderColor: '#FFDF9A',
  },
  priorityPillText: {
    fontSize: typography.xs,
    lineHeight: 14,
    color: '#4F4633',
    fontWeight: typography.medium,
    includeFontPadding: false,
  },
  priorityPillTextActive: {
    color: '#251A00',
    fontWeight: typography.bold,
  },

  sectionsContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
    paddingTop: spacing.xs,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: '#EAB308' },
  sectionDotCompleted: { backgroundColor: colors.textSecondary },
  sectionTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#4F4633',
    fontWeight: typography.bold,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#E6E8EA',
    color: colors.text,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: typography.bold,
  },

  openList: { flex: 1, minHeight: 0 },
  openListContent: { paddingBottom: spacing.sm },
  openListEmptyContent: { flexGrow: 1, justifyContent: 'center' },
  openCardWrap: { marginBottom: spacing.sm },
  openCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D3C5AC40',
    ...shadow.sm,
  },
  openCardInner: { padding: spacing.md },
  openCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  openTitle: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
    marginBottom: 2,
  },
  dueDate: { fontSize: typography.xs, color: colors.textSecondary },
  outletName: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: 4,
  },
  description: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 19 },
  openCardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  footerSpacer: { flex: 1 },
  metaPill: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: { fontSize: typography.xs, color: colors.primary, fontWeight: typography.medium },
  priorityLabel: { fontSize: typography.xs, fontWeight: typography.semibold },
  assignees: { fontSize: typography.xs, color: colors.textSecondary },

  completedSection: {
    marginTop: spacing.md,
    minHeight: 210,
    maxHeight: 250,
  },
  completedSectionHeader: { marginBottom: spacing.sm },
  completedRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingRight: spacing.md,
  },
  completedCard: {
    width: 300,
    backgroundColor: '#F2F4F6',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D3C5AC2A',
  },
  completedMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  completedId: {
    backgroundColor: colors.text,
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: typography.bold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedWhen: { fontSize: 10, color: colors.textSecondary, fontWeight: typography.medium },
  completedTitle: { fontSize: typography.base, color: colors.text, fontWeight: typography.bold, marginBottom: 4 },
  completedDescription: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.md },
  completedFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  completedAssignee: { fontSize: typography.xs, color: colors.text, fontWeight: typography.semibold, maxWidth: 90 },
  completedCategory: {
    fontSize: 10,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  completedPriority: { fontSize: typography.xs, fontWeight: typography.bold },

  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  completedLoadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { paddingVertical: spacing.xl },
  empty: { textAlign: 'center', color: colors.textSecondary, fontSize: typography.sm },
  completedEmpty: { color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing.md },
});
