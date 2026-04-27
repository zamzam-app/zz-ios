import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTasks } from '../../hooks/useTasks';
import { Task, TaskPriority } from '../../api/endpoints/tasks';
import StatusBadge from '../../components/StatusBadge';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';
import { CreateTaskContent } from './CreateTaskScreen';
import { TaskMetricFilter, TASK_METRIC_FILTER_LABELS } from '../../constants/taskFilters';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TasksList'>;
type TasksRoute = RouteProp<TasksStackParamList, 'TasksList'>;
type PriorityFilter = TaskPriority | 'ALL';

const PRIORITY_FILTERS: Array<{ label: string; value: PriorityFilter }> = [
  { label: 'All priorities', value: 'ALL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   colors.priorityHigh,
  MEDIUM: colors.priorityMedium,
  LOW:    colors.priorityLow,
};

const PRIORITY_SORT_ORDER: Record<TaskPriority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function toTimestamp(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function dueDateSortValue(iso?: string | null) {
  return toTimestamp(iso) ?? Number.MAX_SAFE_INTEGER;
}

function compareDueDateAsc(a: Task, b: Task) {
  return dueDateSortValue(a.dueDate) - dueDateSortValue(b.dueDate);
}

function compareCreatedAtDesc(a: Task, b: Task) {
  const createdA = toTimestamp(a.createdAt) ?? 0;
  const createdB = toTimestamp(b.createdAt) ?? 0;
  return createdB - createdA;
}

function getOpenTaskGroup(task: Task, now: Date) {
  if (task.priority === 'HIGH') return 0;
  if (isSameCalendarDay(task.dueDate, now)) return 1;
  return 2;
}

function compareOpenTaskOrder(a: Task, b: Task, now: Date) {
  const groupA = getOpenTaskGroup(a, now);
  const groupB = getOpenTaskGroup(b, now);
  const groupDiff = groupA - groupB;
  if (groupDiff !== 0) return groupDiff;

  if (groupA === 1) {
    const priorityDiff = (PRIORITY_SORT_ORDER[a.priority] ?? 99) - (PRIORITY_SORT_ORDER[b.priority] ?? 99);
    if (priorityDiff !== 0) return priorityDiff;

    const dueDiff = compareDueDateAsc(a, b);
    if (dueDiff !== 0) return dueDiff;

    return compareCreatedAtDesc(a, b);
  }

  const dueDiff = compareDueDateAsc(a, b);
  if (dueDiff !== 0) return dueDiff;

  return compareCreatedAtDesc(a, b);
}

function completedTaskSortValue(task: Task) {
  return toTimestamp(task.completedAt ?? task.updatedAt ?? task.createdAt) ?? 0;
}

function compareCompletedTaskOrder(a: Task, b: Task) {
  const completedDiff = completedTaskSortValue(b) - completedTaskSortValue(a);
  if (completedDiff !== 0) return completedDiff;

  return compareCreatedAtDesc(a, b);
}

function isTaskCompleted(task: Task) {
  return task.status.trim().toUpperCase() === 'COMPLETED';
}

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

function isSameCalendarDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  );
}

function OpenTaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const isOverdue = !isTaskCompleted(task) && new Date(task.dueDate) < new Date();
  const outletName    = getTaskOutletName(task);
  const categoryName  = getTaskCategoryName(task);
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
  const route = useRoute<TasksRoute>();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [metricFilter, setMetricFilter] = useState<TaskMetricFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: tasks, isLoading, isFetching, refetch } = useTasks({ limit: 50 });
  const allTasks = tasks ?? [];
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  useEffect(() => {
    const incomingMetric = route.params?.initialTaskFilter?.metric;
    if (!incomingMetric) return;
    setMetricFilter(incomingMetric);
  }, [route.params?.initialTaskFilter?.metric, route.params?.initialTaskFilter?.nonce]);

  const searchAndPriorityFilteredTasks = useMemo(
    () => allTasks.filter((task) => {
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      if (!matchesPriority) return false;
      if (!normalizedSearchQuery) return true;

      const searchTokens = [
        task.id,
        task.title,
        task.description,
        task.priority,
        task.status,
        getTaskOutletName(task),
        getTaskCategoryName(task),
        ...getTaskAssigneeNames(task),
      ]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLowerCase();

      return searchTokens.includes(normalizedSearchQuery);
    }),
    [allTasks, priorityFilter, normalizedSearchQuery],
  );

  const filteredTasks = useMemo(() => {
    if (metricFilter === 'all') return searchAndPriorityFilteredTasks;

    return searchAndPriorityFilteredTasks.filter((task) => {
      if (metricFilter === 'open') return !isTaskCompleted(task);
      if (metricFilter === 'resolved') return isTaskCompleted(task);
      if (metricFilter === 'critical') return !isTaskCompleted(task) && task.priority === 'HIGH';
      if (metricFilter === 'due_today') return !isTaskCompleted(task) && isSameCalendarDay(task.dueDate);
      return true;
    });
  }, [searchAndPriorityFilteredTasks, metricFilter]);

  const openTasks = useMemo(() => {
    const now = new Date();
    return filteredTasks
      .filter((task) => !isTaskCompleted(task))
      .sort((a, b) => compareOpenTaskOrder(a, b, now));
  }, [filteredTasks]);

  const completedTasks = useMemo(
    () => filteredTasks
      .filter(isTaskCompleted)
      .sort(compareCompletedTaskOrder),
    [filteredTasks],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Task Board</Text>
          <Text style={styles.subheading}>Manage operational flows across all outlets</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)} activeOpacity={0.84}>
          <Text style={styles.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor={colors.textSecondary}
            onFocus={() => setShowPriorityMenu(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.searchClearBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <Text style={styles.searchClearText}>x</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterMenuWrap}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open priority filters"
            style={[styles.filterIconBtn, priorityFilter !== 'ALL' && styles.filterIconBtnActive]}
            onPress={() => setShowPriorityMenu((prev) => !prev)}
            activeOpacity={0.82}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={priorityFilter === 'ALL' ? colors.textSecondary : colors.primaryDark}
            />
          </TouchableOpacity>

          {showPriorityMenu && (
            <View style={styles.priorityDropdown}>
              {PRIORITY_FILTERS.map((option, index) => {
                const active = option.value === priorityFilter;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.priorityOption,
                      index < PRIORITY_FILTERS.length - 1 && styles.priorityOptionDivider,
                      active && styles.priorityOptionActive,
                    ]}
                    onPress={() => {
                      setPriorityFilter(option.value);
                      setShowPriorityMenu(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.priorityOptionText, active && styles.priorityOptionTextActive]}>
                      {option.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {metricFilter !== 'all' && (
        <View style={styles.metricFilterChipRow}>
          <View style={styles.metricFilterChip}>
            <Text style={styles.metricFilterChipText}>
              {`Filtered: ${TASK_METRIC_FILTER_LABELS[metricFilter]}`}
            </Text>
            <TouchableOpacity onPress={() => setMetricFilter('all')} style={styles.metricFilterChipClear}>
              <Text style={styles.metricFilterChipClearText}>x</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showPriorityMenu && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPriorityMenu(false)}
          style={styles.priorityMenuBackdrop}
        />
      )}

      <View style={styles.sectionsContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingWrap}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Open Tasks</Text>
          </View>
          <Text style={styles.sectionCount}>{openTasks.length} active</Text>
        </View>

        <View style={styles.openListShell}>
          <FlatList
            style={styles.openList}
            data={openTasks}
            keyExtractor={(task) => task.id}
            contentContainerStyle={
              openTasks.length > 0 ? styles.openListContent : styles.openListEmptyContent
            }
            showsVerticalScrollIndicator
            persistentScrollbar
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
        </View>

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

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.createModalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.createModalScrim}
            onPress={() => setShowCreateModal(false)}
          />
          <View style={styles.createSheet}>
            <View style={styles.createSheetTop}>
              <View style={styles.createSheetHandle} />
              <View style={styles.createSheetHeader}>
                <Text style={styles.createSheetTitle}>Assign New Task</Text>
                <TouchableOpacity
                  style={styles.createSheetClose}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.createSheetCloseText}>X</Text>
                </TouchableOpacity>
              </View>
            </View>
            <CreateTaskContent
              onSuccess={() => {
                setShowCreateModal(false);
                void refetch();
              }}
              bottomPadding={24}
              fill
              backgroundColor={colors.surface}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },

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
    backgroundColor: colors.buttonPrimaryBg,
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

  controlsRow: {
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  searchWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  searchInput: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 38,
    paddingRight: 34,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  searchClearBtn: {
    position: 'absolute',
    right: 8,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6E8EA',
  },
  searchClearText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.bold,
    lineHeight: 16,
    includeFontPadding: false,
  },
  filterMenuWrap: {
    position: 'relative',
    zIndex: 60,
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  filterIconBtnActive: {
    borderColor: colors.primaryTintStrong,
    backgroundColor: colors.primaryTint,
  },
  priorityDropdown: {
    position: 'absolute',
    right: 0,
    top: 46,
    minWidth: 170,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
    zIndex: 999,
    overflow: 'hidden',
  },
  priorityOption: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  priorityOptionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  priorityOptionActive: {
    backgroundColor: colors.primaryTint,
  },
  priorityOptionText: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
  },
  priorityOptionTextActive: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
  priorityMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  metricFilterChipRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  metricFilterChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintStrong,
    paddingLeft: spacing.sm,
    paddingRight: 6,
    paddingVertical: 4,
  },
  metricFilterChipText: {
    fontSize: typography.xs,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  metricFilterChipClear: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6E8EA',
  },
  metricFilterChipClearText: {
    fontSize: 11,
    color: colors.textSecondary,
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

  openListShell: { flex: 1, minHeight: 0, position: 'relative' },
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

  createModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  createModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 28, 30, 0.4)',
  },
  createSheet: {
    height: '92%',
    minHeight: 420,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#191c1e',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 24,
  },
  createSheetTop: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#D3C5AC40',
    backgroundColor: colors.surfaceOverlay,
  },
  createSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#E6E8EA',
    marginBottom: spacing.sm,
  },
  createSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createSheetTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  createSheetClose: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F6',
  },
  createSheetCloseText: {
    color: colors.textSecondary,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});
