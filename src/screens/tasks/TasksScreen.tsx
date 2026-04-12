import React, { useState } from 'react';
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
import { useOutlets } from '../../hooks/useOutlets';
import { Task, TaskStatus } from '../../api/endpoints/tasks';
import StatusBadge from '../../components/StatusBadge';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TasksList'>;

const STATUSES: { label: string; value: TaskStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Review', value: 'READY_FOR_REVIEW' },
  { label: 'Done', value: 'COMPLETED' },
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: colors.priorityHigh,
  MEDIUM: colors.priorityMedium,
  LOW: colors.priorityLow,
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type TaskCompat = Task & {
  taskCategory?: { name?: string } | null;
  outlet?: { name?: string } | null;
  assignees?: Array<{ name?: string }>;
};

function getCategoryName(task: Task) {
  const compatTask = task as TaskCompat;
  return compatTask.taskCategory?.name ?? task.category;
}

function getOutletName(task: Task) {
  const compatTask = task as TaskCompat;
  return compatTask.outlet?.name ?? task.outletName;
}

function getAssigneeNames(task: Task) {
  if (task.assigneeNames && task.assigneeNames.length > 0) {
    return task.assigneeNames;
  }
  const compatTask = task as TaskCompat;
  return (compatTask.assignees ?? [])
    .map((assignee) => assignee.name)
    .filter((name): name is string => Boolean(name));
}

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const isOverdue = task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();
  const outletName = getOutletName(task);
  const categoryName = getCategoryName(task);
  const assigneeNames = getAssigneeNames(task);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <StatusBadge status={task.status} />
        <Text style={[styles.dueDate, isOverdue && { color: colors.error }]}>
          {formatDate(task.dueDate)}
        </Text>
      </View>

      {outletName && (
        <Text style={styles.outletName}>{outletName}</Text>
      )}
      <Text style={styles.description} numberOfLines={2}>{task.description}</Text>

      <View style={styles.cardFooter}>
        {categoryName && (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{categoryName}</Text>
          </View>
        )}
        <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] ?? colors.textSecondary }]} />
        <Text style={styles.priorityText}>{task.priority}</Text>
        {assigneeNames.length > 0 && (
          <Text style={styles.assignees} numberOfLines={1}>
            · {assigneeNames.join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const navigation = useNavigation<Nav>();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [outletFilter, setOutletFilter] = useState<string | undefined>();

  const query = {
    limit: 50,
    ...(statusFilter !== 'ALL' && { status: statusFilter }),
    ...(outletFilter && { outletId: outletFilter }),
  };

  const { data: tasks, isLoading, isFetching, refetch } = useTasks(query);
  const { data: outlets } = useOutlets();

  const listData = tasks ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <FlatList
        data={listData}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
        ListHeaderComponent={(
          <>
            <View style={styles.header}>
              <Text style={styles.heading}>Tasks</Text>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => navigation.navigate('CreateTask')}
              >
                <Text style={styles.createBtnText}>+ New</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroll}
            >
              {STATUSES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.filterChip, statusFilter === item.value && styles.filterChipActive]}
                  onPress={() => setStatusFilter(item.value)}
                >
                  <Text style={[styles.filterChipText, statusFilter === item.value && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {outlets && outlets.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
                style={styles.filterScroll}
              >
                <TouchableOpacity
                  style={[styles.filterChip, outletFilter === undefined && styles.filterChipActive]}
                  onPress={() => setOutletFilter(undefined)}
                >
                  <Text style={[styles.filterChipText, outletFilter === undefined && styles.filterChipTextActive]}>
                    All Outlets
                  </Text>
                </TouchableOpacity>
                {outlets.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.filterChip, outletFilter === item.id && styles.filterChipActive]}
                    onPress={() => setOutletFilter(item.id)}
                  >
                    <Text style={[styles.filterChipText, outletFilter === item.id && styles.filterChipTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
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
  listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  heading: { fontSize: typography.xl, fontWeight: typography.bold, color: colors.text },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.full,
  },
  createBtnText: { color: colors.textInverse, fontWeight: typography.semibold, fontSize: typography.sm },

  filterScroll: { marginBottom: spacing.sm },
  filterRow: { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: typography.sm, color: colors.textSecondary },
  filterChipTextActive: { color: colors.textInverse, fontWeight: typography.medium },

  taskItem: { paddingHorizontal: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  dueDate: { fontSize: typography.xs, color: colors.textSecondary },
  outletName: { fontSize: typography.sm, fontWeight: typography.semibold, color: colors.primary, marginBottom: 4 },
  description: { fontSize: typography.sm, color: colors.text, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  categoryPill: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  categoryText: { fontSize: typography.xs, color: colors.textSecondary },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: typography.xs, color: colors.textSecondary },
  assignees: { fontSize: typography.xs, color: colors.textSecondary, flex: 1 },

  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xxl },
  empty: { textAlign: 'center', color: colors.textSecondary },
});
