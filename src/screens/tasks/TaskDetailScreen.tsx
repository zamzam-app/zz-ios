import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTask, useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks';
import { TaskStatus } from '../../api/endpoints/tasks';
import StatusBadge from '../../components/StatusBadge';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskDetail'>;

const ALL_STATUSES: TaskStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  READY_FOR_REVIEW: 'Ready for Review',
  COMPLETED: 'Completed',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: colors.priorityHigh,
  MEDIUM: colors.priorityMedium,
  LOW: colors.priorityLow,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const { data: task, isLoading } = useTask(taskId);
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const handleStatusChange = () => {
    if (!task) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...ALL_STATUSES.map((s) => STATUS_LABELS[s]), 'Cancel'],
          cancelButtonIndex: ALL_STATUSES.length,
          title: 'Update Status',
        },
        (idx) => {
          if (idx < ALL_STATUSES.length) {
            updateStatus.mutate({ id: task.id, status: ALL_STATUSES[idx] });
          }
        },
      );
    } else {
      Alert.alert(
        'Update Status',
        undefined,
        [
          ...ALL_STATUSES.map((s) => ({
            text: STATUS_LABELS[s],
            onPress: () => updateStatus.mutate({ id: task.id, status: s }),
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTask.mutate(taskId, {
            onSuccess: () => navigation.goBack(),
          });
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Task not found</Text>
      </View>
    );
  }

  const isOverdue = task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();
  const outletName = getTaskOutletName(task);
  const categoryName = getTaskCategoryName(task);
  const assigneeNames = getTaskAssigneeNames(task);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status + priority */}
        <View style={styles.topRow}>
          <StatusBadge status={task.status} />
          <View style={[styles.priorityBadge, { backgroundColor: (PRIORITY_COLORS[task.priority] ?? colors.textSecondary) + '22' }]}>
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[task.priority] ?? colors.textSecondary }]}>
              {task.priority}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{task.description}</Text>

        {/* Details */}
        <View style={styles.detailsCard}>
          {outletName && <Row label="Outlet" value={outletName} />}
          {categoryName && <Row label="Category" value={categoryName} />}
          <Row
            label="Due Date"
            value={formatDate(task.dueDate)}
          />
          {isOverdue && task.status !== 'COMPLETED' && (
            <Text style={styles.overdueTag}>Overdue</Text>
          )}
          {assigneeNames.length > 0 && (
            <Row label="Assigned To" value={assigneeNames.join(', ')} />
          )}
          <Row label="Created" value={formatDate(task.createdAt)} />
          {task.completedAt && (
            <Row label="Completed" value={formatDate(task.completedAt)} />
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleStatusChange}
          disabled={updateStatus.isPending}
        >
          {updateStatus.isPending ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.primaryBtnText}>Update Status</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Delete Task</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },

  topRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  priorityText: { fontSize: typography.xs, fontWeight: '600' },

  description: {
    fontSize: typography.base,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },

  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: typography.sm, color: colors.textSecondary },
  rowValue: { fontSize: typography.sm, color: colors.text, fontWeight: typography.medium, maxWidth: '60%', textAlign: 'right' },
  overdueTag: { color: colors.error, fontSize: typography.xs, marginTop: spacing.xs },

  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryBtnText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },
  deleteBtn: {
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteBtnText: { color: colors.error, fontSize: typography.base, fontWeight: typography.medium },
});
