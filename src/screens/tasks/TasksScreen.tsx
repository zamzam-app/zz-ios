import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTasks } from '../../hooks/useTasks';
import { useOutlets } from '../../hooks/useOutlets';
import { Task, TaskStatus } from '../../api/endpoints/tasks';
import StatusBadge from '../../components/StatusBadge';
import { FilterDropdown, FilterOption } from '../../components/FilterDropdown';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TasksList'>;

const STATUS_OPTIONS: FilterOption<TaskStatus | 'ALL'>[] = [
  { label: 'All Tasks',  value: 'ALL' },
  { label: 'Open',       value: 'OPEN' },
  { label: 'Completed',  value: 'COMPLETED' },
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   colors.priorityHigh,
  MEDIUM: colors.priorityMedium,
  LOW:    colors.priorityLow,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const isOverdue = task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();
  const outletName    = getTaskOutletName(task);
  const categoryName  = getTaskCategoryName(task);
  const assigneeNames = getTaskAssigneeNames(task);
  const priorityColor = PRIORITY_COLORS[task.priority] ?? colors.textSecondary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardInner}>
        <View style={styles.cardHeader}>
          <StatusBadge status={task.status} />
          <Text style={[styles.dueDate, isOverdue && { color: colors.error }]}>
            {formatDate(task.dueDate)}
          </Text>
        </View>

        {outletName ? <Text style={styles.outletName}>{outletName}</Text> : null}
        <Text style={styles.description} numberOfLines={2}>{task.description}</Text>

        <View style={styles.cardFooter}>
          {categoryName ? (
            <View style={styles.categoryPill}>
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

export default function TasksScreen() {
  const navigation = useNavigation<Nav>();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [outletFilter, setOutletFilter] = useState<string | 'ALL'>('ALL');

  const { data: outlets } = useOutlets();

  const outletOptions: FilterOption<string | 'ALL'>[] = [
    { label: 'All Outlets', value: 'ALL' },
    ...(outlets ?? []).map((o) => ({ label: o.name, value: o.id })),
  ];

  const query = {
    limit: 50,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(outletFilter !== 'ALL' && { outletId: outletFilter }),
  };

  const { data: tasks, isLoading, isFetching, refetch } = useTasks(query);
  const listData = tasks ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Tasks</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateTask')}
          activeOpacity={0.8}
        >
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter pills — rendered at screen level so dropdowns overlay the list */}
      <View style={styles.filterBar}>
        <FilterDropdown
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        {outletOptions.length > 1 && (
          <FilterDropdown
            options={outletOptions}
            value={outletFilter}
            onChange={setOutletFilter}
            maxVisible={5}
          />
        )}
      </View>

      {/* Task list */}
      <FlatList
        data={listData}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
        ListHeaderComponent={
          listData.length > 0 ? (
            <Text style={styles.countLabel}>{listData.length} tasks</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <TaskCard
              task={item}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={(
          <View style={styles.emptyContainer}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.empty}>No tasks found</Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },

  filterBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    zIndex: 20,
  },

  countLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },

  listContent: { flexGrow: 1, paddingBottom: 120, paddingTop: spacing.xs },
  cardWrap: { paddingHorizontal: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.sm,
  },
  cardInner: { padding: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dueDate: { fontSize: typography.xs, color: colors.textSecondary },
  outletName: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: 4,
  },
  description: { fontSize: typography.sm, color: colors.text, marginBottom: spacing.sm, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  footerSpacer: { flex: 1 },
  categoryPill: {
    backgroundColor: colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  categoryText: { fontSize: typography.xs, color: colors.primary, fontWeight: typography.medium },
  priorityLabel: { fontSize: typography.xs, fontWeight: typography.semibold },
  assignees: { fontSize: typography.xs, color: colors.textSecondary },

  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
  empty: { textAlign: 'center', color: colors.textSecondary },
});
