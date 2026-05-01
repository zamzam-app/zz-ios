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
  Alert,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useInfiniteTasks } from '../../hooks/useTasks';
import { Task, TaskPriority } from '../../api/endpoints/tasks';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';
import { CreateTaskContent } from './CreateTaskScreen';
import { TaskMetricFilter, TASK_METRIC_FILTER_LABELS } from '../../constants/taskFilters';
import { getApiErrorMessage } from '../../utils/errors';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TasksList'>;
type TasksRoute = RouteProp<TasksStackParamList, 'TasksList'>;
type PriorityFilter = TaskPriority | 'ALL';
type FilterSection = 'priority' | 'dueDate';

const PRIORITY_FILTERS: Array<{ label: string; value: PriorityFilter }> = [
  { label: 'All priorities', value: 'ALL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

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

type AttachmentType = 'images' | 'videos' | 'audios' | 'files';

function buildAttachmentName(url: string, prefix: string, index: number) {
  try {
    const parsed = new URL(url);
    const fileName = parsed.pathname.split('/').pop();
    if (fileName) return decodeURIComponent(fileName);
  } catch {
    // fallback for non-url strings
  }
  const fallback = url.split('/').pop()?.split('?')[0];
  if (fallback) return decodeURIComponent(fallback);
  return `${prefix}-${index + 1}`;
}

function getTaskAttachmentUrls(task: Task, type: AttachmentType) {
  if (type === 'images') return task.attachments?.images ?? task.imageUrls ?? [];
  if (type === 'videos') return task.attachments?.videos ?? [];
  if (type === 'audios') return task.attachments?.audios ?? [];
  return task.attachments?.files ?? [];
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

function OpenTaskCard({
  task,
  onPress,
  onOpenAttachment,
}: {
  task: Task;
  onPress: () => void;
  onOpenAttachment: (task: Task, type: AttachmentType) => void;
}) {
  const outletName = getTaskOutletName(task);
  const categoryName  = getTaskCategoryName(task);
  const assigneeNames = getTaskAssigneeNames(task);
  const imageCount = getTaskAttachmentUrls(task, 'images').length;
  const videoCount = getTaskAttachmentUrls(task, 'videos').length;
  const audioCount = getTaskAttachmentUrls(task, 'audios').length;
  const fileCount = getTaskAttachmentUrls(task, 'files').length;

  return (
    <TouchableOpacity style={styles.openCard} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.openCardInner}>
        <View style={styles.openCardTopRow}>
          <View style={styles.openCardPill}>
            <Text style={styles.openCardPillText}>{categoryName || 'Task'}</Text>
          </View>
          {outletName ? <Text style={styles.openCardOutletName} numberOfLines={1}>{outletName}</Text> : null}
        </View>

        <Text style={styles.openTitle} numberOfLines={2}>
          {task.title || task.description}
        </Text>
        <Text style={styles.openMetaLine} numberOfLines={1}>
          <Text style={styles.openMetaLabel}>Assigned to: </Text>
          <Text style={styles.openMetaStrong}>{assigneeNames.length > 0 ? assigneeNames.join(', ') : 'Unassigned'}</Text>
        </Text>

        <View style={styles.openCardDivider} />

        <View style={styles.openCardFooter}>
          <View style={styles.openCardAttachmentActions}>
            <TouchableOpacity style={styles.openCardIconBtn} onPress={() => onOpenAttachment(task, 'images')}>
              <Ionicons name="camera-outline" size={15} color={colors.textSecondary} />
              {imageCount > 0 ? <Text style={styles.openCardIconCount}>{imageCount}</Text> : null}
            </TouchableOpacity>
            <TouchableOpacity style={styles.openCardIconBtn} onPress={() => onOpenAttachment(task, 'videos')}>
              <Ionicons name="videocam-outline" size={15} color={colors.textSecondary} />
              {videoCount > 0 ? <Text style={styles.openCardIconCount}>{videoCount}</Text> : null}
            </TouchableOpacity>
            <TouchableOpacity style={styles.openCardIconBtn} onPress={() => onOpenAttachment(task, 'files')}>
              <Ionicons name="document-outline" size={15} color={colors.textSecondary} />
              {fileCount > 0 ? <Text style={styles.openCardIconCount}>{fileCount}</Text> : null}
            </TouchableOpacity>
            <TouchableOpacity style={styles.openCardIconBtn} onPress={() => onOpenAttachment(task, 'audios')}>
              <Ionicons name="mic-outline" size={15} color={colors.textSecondary} />
              {audioCount > 0 ? <Text style={styles.openCardIconCount}>{audioCount}</Text> : null}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CompletedTaskCard({
  task,
  onPress,
  onOpenAttachment,
}: {
  task: Task;
  onPress: () => void;
  onOpenAttachment: (task: Task, type: AttachmentType) => void;
}) {
  const assigneeNames = getTaskAssigneeNames(task);
  const categoryName = getTaskCategoryName(task);
  const outletName = getTaskOutletName(task);
  const imageCount = getTaskAttachmentUrls(task, 'images').length;
  const videoCount = getTaskAttachmentUrls(task, 'videos').length;
  const audioCount = getTaskAttachmentUrls(task, 'audios').length;
  const fileCount = getTaskAttachmentUrls(task, 'files').length;

  return (
    <TouchableOpacity style={styles.completedCard} onPress={onPress} activeOpacity={0.78}>
      <View style={styles.openCardTopRow}>
        <View style={styles.openCardPill}>
          <Text style={styles.openCardPillText}>{categoryName || 'Task'}</Text>
        </View>
        {outletName ? <Text style={styles.openCardOutletName} numberOfLines={1}>{outletName}</Text> : null}
      </View>
      <Text style={styles.completedWhen}>{formatRelativeTime(task.completedAt)}</Text>

      <Text style={styles.openTitle} numberOfLines={2}>
        {task.title || task.description}
      </Text>
      <Text style={styles.openMetaLine} numberOfLines={1}>
        <Text style={styles.openMetaLabel}>Assigned to: </Text>
        <Text style={styles.openMetaStrong}>{assigneeNames.length > 0 ? assigneeNames.join(', ') : 'Unassigned'}</Text>
      </Text>

      <View style={styles.openCardDivider} />

      <View style={styles.openCardFooter}>
        <View style={styles.openCardAttachmentActions}>
          <TouchableOpacity style={styles.openCardIconBtn} onPress={() => onOpenAttachment(task, 'images')}>
            <Ionicons name="camera-outline" size={15} color={colors.textSecondary} />
            {imageCount > 0 ? <Text style={styles.openCardIconCount}>{imageCount}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.openCardIconBtn} onPress={() => onOpenAttachment(task, 'videos')}>
            <Ionicons name="videocam-outline" size={15} color={colors.textSecondary} />
            {videoCount > 0 ? <Text style={styles.openCardIconCount}>{videoCount}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.openCardIconBtn} onPress={() => onOpenAttachment(task, 'files')}>
            <Ionicons name="document-outline" size={15} color={colors.textSecondary} />
            {fileCount > 0 ? <Text style={styles.openCardIconCount}>{fileCount}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity style={styles.openCardIconBtn} onPress={() => onOpenAttachment(task, 'audios')}>
            <Ionicons name="mic-outline" size={15} color={colors.textSecondary} />
            {audioCount > 0 ? <Text style={styles.openCardIconCount}>{audioCount}</Text> : null}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const userIdentifier = user?._id || user?.id;
  const navigation = useNavigation<Nav>();
  const route = useRoute<TasksRoute>();
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [dueDateFilter, setDueDateFilter] = useState<Date | null>(null);
  const [metricFilter, setMetricFilter] = useState<TaskMetricFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilterSection, setActiveFilterSection] = useState<FilterSection>('priority');
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [attachmentModal, setAttachmentModal] = useState<{ task: Task; type: AttachmentType } | null>(null);
  const [lastLoadError, setLastLoadError] = useState('');

  const showOpenSection = metricFilter !== 'resolved';
  const showCompletedSection = metricFilter === 'all' || metricFilter === 'resolved';
  const isCriticalMetric = metricFilter === 'critical';
  const isDueTodayMetric = metricFilter === 'due_today';

  const effectivePriorityFilter: TaskPriority | undefined = isCriticalMetric
    ? 'HIGH'
    : priorityFilter === 'ALL'
      ? undefined
      : priorityFilter;

  const effectiveOpenDateFilter = dueDateFilter ?? (isDueTodayMetric ? new Date() : null);
  const effectiveOpenDueDateStart = effectiveOpenDateFilter
    ? new Date(
      effectiveOpenDateFilter.getFullYear(),
      effectiveOpenDateFilter.getMonth(),
      effectiveOpenDateFilter.getDate(),
    )
    : null;
  const effectiveOpenDueDateEnd = effectiveOpenDueDateStart
    ? new Date(effectiveOpenDueDateStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    : null;

  const effectiveCompletedDueDateStart = dueDateFilter
    ? new Date(dueDateFilter.getFullYear(), dueDateFilter.getMonth(), dueDateFilter.getDate())
    : null;
  const effectiveCompletedDueDateEnd = effectiveCompletedDueDateStart
    ? new Date(effectiveCompletedDueDateStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    : null;

  const openTasksQuery = useInfiniteTasks(
    {
      status: 'OPEN',
      limit: 20,
      priority: effectivePriorityFilter,
      search: debouncedSearchQuery || undefined,
      dueFrom: effectiveOpenDueDateStart ? effectiveOpenDueDateStart.toISOString() : undefined,
      dueTo: effectiveOpenDueDateEnd ? effectiveOpenDueDateEnd.toISOString() : undefined,
      assigneeId: isAdmin ? undefined : userIdentifier,
    },
    { enabled: showOpenSection },
  );

  const completedTasksQuery = useInfiniteTasks(
    {
      status: 'COMPLETED',
      limit: 20,
      priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
      search: debouncedSearchQuery || undefined,
      dueFrom: effectiveCompletedDueDateStart ? effectiveCompletedDueDateStart.toISOString() : undefined,
      dueTo: effectiveCompletedDueDateEnd ? effectiveCompletedDueDateEnd.toISOString() : undefined,
      assigneeId: isAdmin ? undefined : userIdentifier,
    },
    { enabled: showCompletedSection },
  );

  useEffect(() => {
    const incomingMetric = route.params?.initialTaskFilter?.metric;
    if (!incomingMetric) return;
    setMetricFilter(incomingMetric);
  }, [route.params?.initialTaskFilter?.metric, route.params?.initialTaskFilter?.nonce]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    const openError = openTasksQuery.error;
    const completedError = completedTasksQuery.error;
    if (!openError && !completedError) {
      if (lastLoadError) setLastLoadError('');
      return;
    }
    const message = getApiErrorMessage(
      openError ?? completedError,
      'Could not apply filters. Please try again.',
    );
    if (message === lastLoadError) return;
    setLastLoadError(message);
    Alert.alert('Could not load tasks', message);
  }, [openTasksQuery.error, completedTasksQuery.error, lastLoadError]);

  const openTasksFromApi = useMemo(
    () => (openTasksQuery.data?.pages ?? []).flatMap((page) => page.data),
    [openTasksQuery.data?.pages],
  );
  const completedTasksFromApi = useMemo(
    () => (completedTasksQuery.data?.pages ?? []).flatMap((page) => page.data),
    [completedTasksQuery.data?.pages],
  );

  const openTasks = useMemo(() => {
    const now = new Date();
    return [...openTasksFromApi].sort((a, b) => compareOpenTaskOrder(a, b, now));
  }, [openTasksFromApi]);

  const completedTasks = useMemo(
    () => [...completedTasksFromApi].sort(compareCompletedTaskOrder),
    [completedTasksFromApi],
  );
  const openTasksTotal = openTasksQuery.data?.pages?.[0]?.meta.total ?? openTasks.length;
  const completedTasksTotal = completedTasksQuery.data?.pages?.[0]?.meta.total ?? completedTasks.length;

  const formatFilterDate = (date: Date) => date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const onDueDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDueDatePicker(false);
    if (selectedDate) setDueDateFilter(selectedDate);
  };

  const refetch = async () => {
    const refetchers: Array<() => Promise<unknown>> = [];
    if (showOpenSection) refetchers.push(() => openTasksQuery.refetch());
    if (showCompletedSection) refetchers.push(() => completedTasksQuery.refetch());
    await Promise.all(refetchers.map((run) => run()));
  };
  const isLoading = showOpenSection
    ? (openTasksQuery.isLoading || (showCompletedSection && completedTasksQuery.isLoading))
    : completedTasksQuery.isLoading;
  const isFetching = showOpenSection
    ? (openTasksQuery.isFetching || (showCompletedSection && completedTasksQuery.isFetching))
    : completedTasksQuery.isFetching;

  const openAttachmentModal = (task: Task, type: AttachmentType) => {
    const urls = getTaskAttachmentUrls(task, type);
    if (urls.length === 0) {
      Alert.alert('No attachments', `No ${type} found for this task.`);
      return;
    }
    setAttachmentModal({ task, type });
  };

  const openExternalAttachment = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Attachment unavailable', 'Could not open this attachment.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Attachment unavailable', 'Could not open this attachment.');
    }
  };

  const attachmentModalUrls = attachmentModal
    ? getTaskAttachmentUrls(attachmentModal.task, attachmentModal.type)
    : [];
  const attachmentModalTitle = attachmentModal
    ? (attachmentModal.type === 'images'
      ? 'Image Attachments'
      : attachmentModal.type === 'videos'
        ? 'Video Attachments'
        : attachmentModal.type === 'audios'
          ? 'Audio Attachments'
          : 'File Attachments')
    : '';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Task Board</Text>
          <Text style={styles.subheading}>Manage operational flows across all outlets</Text>
        </View>
        {!isManager && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)} activeOpacity={0.84}>
            <Text style={styles.createBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
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
            accessibilityLabel="Open filters"
            style={[
              styles.filterIconBtn,
              (priorityFilter !== 'ALL' || Boolean(dueDateFilter)) && styles.filterIconBtnActive,
            ]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.82}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={priorityFilter === 'ALL' && !dueDateFilter ? colors.textSecondary : colors.primaryDark}
            />
          </TouchableOpacity>
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

      {dueDateFilter && (
        <View style={styles.metricFilterChipRow}>
          <View style={styles.metricFilterChip}>
            <Text style={styles.metricFilterChipText}>
              {`Due: ${formatFilterDate(dueDateFilter)}`}
            </Text>
            <TouchableOpacity onPress={() => setDueDateFilter(null)} style={styles.metricFilterChipClear}>
              <Text style={styles.metricFilterChipClearText}>x</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.sectionsContainer}>
        {showOpenSection && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingWrap}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Open Tasks</Text>
              </View>
              <Text style={styles.sectionCount}>{openTasksTotal} active</Text>
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
                onEndReached={() => {
                  if (openTasksQuery.hasNextPage && !openTasksQuery.isFetchingNextPage) {
                    void openTasksQuery.fetchNextPage();
                  }
                }}
                onEndReachedThreshold={0.3}
                renderItem={({ item }) => (
                  <View style={styles.openCardWrap}>
                    <OpenTaskCard
                      task={item}
                      onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                      onOpenAttachment={openAttachmentModal}
                    />
                  </View>
                )}
                ListFooterComponent={
                  openTasksQuery.isFetchingNextPage ? (
                    <View style={styles.loadingMoreWrap}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : null
                }
                ListEmptyComponent={(
                  isLoading ? (
                    <View style={styles.loadingWrap}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : (
                    <View style={styles.emptyWrap}>
                      <Text style={styles.empty}>{isManager ? 'No open tasks found for you' : 'No open tasks found'}</Text>
                    </View>
                  )
                )}
              />
            </View>
          </>
        )}

        {showCompletedSection && (
          <View style={styles.completedSection}>
            <View style={styles.completedSectionHeader}>
              <View style={styles.sectionHeadingWrap}>
                <View style={[styles.sectionDot, styles.sectionDotCompleted]} />
                <Text style={styles.sectionTitle}>Completed Tasks</Text>
              </View>
              <Text style={styles.sectionCount}>{completedTasksTotal} done</Text>
            </View>

            {!isLoading && completedTasks.length === 0 && (
              <Text style={styles.completedEmpty}>{isManager ? 'No completed tasks found for you' : 'No completed tasks yet'}</Text>
            )}

            {isLoading && (
              <View style={styles.completedLoadingWrap}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}

            {!isLoading && completedTasks.length > 0 && (
              <FlatList
                horizontal
                data={completedTasks}
                keyExtractor={(task) => task.id}
                contentContainerStyle={styles.completedRow}
                showsHorizontalScrollIndicator={false}
                onEndReached={() => {
                  if (completedTasksQuery.hasNextPage && !completedTasksQuery.isFetchingNextPage) {
                    void completedTasksQuery.fetchNextPage();
                  }
                }}
                onEndReachedThreshold={0.4}
                renderItem={({ item }) => (
                  <CompletedTaskCard
                    task={item}
                    onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
                    onOpenAttachment={openAttachmentModal}
                  />
                )}
                ListFooterComponent={
                  completedTasksQuery.isFetchingNextPage ? (
                    <View style={styles.completedLoadingMoreWrap}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        )}
      </View>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowFilterModal(false);
          setShowDueDatePicker(false);
        }}
      >
        <View style={styles.createModalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.createModalScrim}
            onPress={() => {
              setShowFilterModal(false);
              setShowDueDatePicker(false);
            }}
          />
          <View style={styles.filterSheet}>
            <View style={styles.createSheetTop}>
              <View style={styles.createSheetHandle} />
              <View style={styles.createSheetHeader}>
                <Text style={styles.createSheetTitle}>Filters</Text>
                <TouchableOpacity
                  style={styles.createSheetClose}
                  onPress={() => {
                    setShowFilterModal(false);
                    setShowDueDatePicker(false);
                  }}
                >
                  <Text style={styles.createSheetCloseText}>X</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterBody}>
              <View style={styles.filterSidebar}>
                <TouchableOpacity
                  style={[styles.filterSidebarItem, activeFilterSection === 'priority' && styles.filterSidebarItemActive]}
                  onPress={() => setActiveFilterSection('priority')}
                >
                  <Text style={[styles.filterSidebarItemText, activeFilterSection === 'priority' && styles.filterSidebarItemTextActive]}>
                    Priority
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterSidebarItem, activeFilterSection === 'dueDate' && styles.filterSidebarItemActive]}
                  onPress={() => setActiveFilterSection('dueDate')}
                >
                  <Text style={[styles.filterSidebarItemText, activeFilterSection === 'dueDate' && styles.filterSidebarItemTextActive]}>
                    Due Date
                  </Text>
                </TouchableOpacity>
                <View style={styles.filterSidebarFooter}>
                  <TouchableOpacity
                    style={styles.filterSidebarClearBtn}
                    onPress={() => {
                      setPriorityFilter('ALL');
                      setDueDateFilter(null);
                      setShowDueDatePicker(false);
                      setActiveFilterSection('priority');
                    }}
                    activeOpacity={0.82}
                  >
                    <Text style={styles.filterSidebarClearBtnText}>Clear Filters</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.filterContent}>
                {activeFilterSection === 'priority' && (
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Filter by priority</Text>
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
                          onPress={() => setPriorityFilter(option.value)}
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

                {activeFilterSection === 'dueDate' && (
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Filter by due date</Text>
                    <Text style={styles.filterSectionHint}>
                      {dueDateFilter ? `Selected: ${formatFilterDate(dueDateFilter)}` : 'No date selected'}
                    </Text>

                    <TouchableOpacity
                      style={styles.filterActionBtn}
                      onPress={() => setShowDueDatePicker(true)}
                      activeOpacity={0.82}
                    >
                      <Text style={styles.filterActionBtnText}>{dueDateFilter ? 'Change Date' : 'Select Date'}</Text>
                    </TouchableOpacity>

                    {dueDateFilter && (
                      <TouchableOpacity
                        style={[styles.filterActionBtn, styles.filterActionBtnSecondary]}
                        onPress={() => setDueDateFilter(null)}
                        activeOpacity={0.82}
                      >
                        <Text style={[styles.filterActionBtnText, styles.filterActionBtnSecondaryText]}>Clear Date</Text>
                      </TouchableOpacity>
                    )}

                    {showDueDatePicker && (
                      <DateTimePicker
                        value={dueDateFilter ?? new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={onDueDateChange}
                      />
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>

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

      <Modal
        visible={Boolean(attachmentModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachmentModal(null)}
      >
        <View style={styles.attachModalRoot}>
          <TouchableOpacity style={styles.attachModalScrim} activeOpacity={1} onPress={() => setAttachmentModal(null)} />
          <View style={styles.attachModalCard}>
            <View style={styles.attachModalHeader}>
              <Text style={styles.attachModalTitle}>{attachmentModalTitle}</Text>
              <TouchableOpacity onPress={() => setAttachmentModal(null)} style={styles.attachModalCloseBtn}>
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.attachModalContent}>
              {attachmentModal?.type === 'images'
                ? attachmentModalUrls.map((url, index) => (
                  <TouchableOpacity
                    key={`${url}-${index}`}
                    onPress={() => { void openExternalAttachment(url); }}
                    activeOpacity={0.84}
                    style={styles.attachImageItem}
                  >
                    <Image source={{ uri: url }} style={styles.attachImageThumb} resizeMode="cover" />
                  </TouchableOpacity>
                ))
                : attachmentModalUrls.map((url, index) => (
                  <TouchableOpacity
                    key={`${url}-${index}`}
                    style={styles.attachRow}
                    onPress={() => { void openExternalAttachment(url); }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.attachRowLeft}>
                      <Ionicons
                        name={
                          attachmentModal?.type === 'videos'
                            ? 'videocam-outline'
                            : attachmentModal?.type === 'audios'
                              ? 'mic-outline'
                              : 'document-outline'
                        }
                        size={16}
                        color={colors.primaryDark}
                      />
                      <Text style={styles.attachRowText} numberOfLines={1}>
                        {buildAttachmentName(url, attachmentModal?.type ?? 'file', index)}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
            </ScrollView>
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
    borderColor: '#D3C5AC55',
    ...shadow.sm,
  },
  openCardInner: { padding: spacing.md, gap: spacing.sm },
  openCardPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#8ED3AE',
    backgroundColor: '#DDF6E9',
  },
  openCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  openCardPillText: { fontSize: typography.xs, color: '#1C7A52', fontWeight: typography.semibold },
  openCardOutletName: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  openTitle: {
    fontSize: typography.lg,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  openMetaLine: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  openMetaLabel: {
    fontSize: typography.sm,
    color: '#4B6584',
    fontWeight: typography.semibold,
  },
  openMetaStrong: { color: colors.text, fontWeight: typography.bold },
  openCardDivider: { borderBottomWidth: 1, borderBottomColor: '#D3C5AC55' },
  openCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  openCardAttachmentActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  openCardIconBtn: { minWidth: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2 },
  openCardIconCount: { fontSize: 10, color: colors.textSecondary, fontWeight: typography.semibold },

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
    backgroundColor: '#EEF1F4',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D3C5AC2A',
    gap: spacing.sm,
  },
  completedWhen: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: typography.medium },

  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  loadingMoreWrap: { paddingVertical: spacing.sm, alignItems: 'center' },
  completedLoadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  completedLoadingMoreWrap: { justifyContent: 'center', alignItems: 'center', paddingRight: spacing.sm },
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
  filterSheet: {
    maxHeight: '72%',
    minHeight: 360,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  filterBody: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 300,
  },
  filterSidebar: {
    width: 118,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.screenBackground,
    paddingVertical: spacing.xs,
  },
  filterSidebarFooter: {
    marginTop: 'auto',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  filterSidebarClearBtn: {
    minHeight: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  filterSidebarClearBtnText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterSidebarItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  filterSidebarItemActive: {
    backgroundColor: colors.primaryTint,
    borderLeftColor: colors.primary,
  },
  filterSidebarItemText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  filterSidebarItemTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterSectionTitle: {
    fontSize: typography.md,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  filterSectionHint: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  filterActionBtn: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  filterActionBtnText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: typography.semibold,
  },
  filterActionBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActionBtnSecondaryText: {
    color: colors.text,
  },

  attachModalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  attachModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000055',
  },
  attachModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '72%',
    overflow: 'hidden',
  },
  attachModalHeader: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachModalTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  attachModalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF1F4',
  },
  attachModalContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  attachImageItem: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachImageThumb: {
    width: '100%',
    height: 180,
  },
  attachRow: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, marginRight: spacing.sm },
  attachRowText: { flex: 1, fontSize: typography.sm, color: colors.text },
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
