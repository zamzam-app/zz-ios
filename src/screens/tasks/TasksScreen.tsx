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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteTasks } from '../../hooks/useTasks';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import DatePickerModal from '../../components/DatePickerModal';
import { Task, TaskPriority } from '../../api/endpoints/tasks';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskOutletName } from './taskDisplay';
import TaskBadgeRow from './TaskBadgeRow';
import { buildTaskBarModel } from './taskBadges';
import { CreateTaskContent } from './CreateTaskScreen';
import { TaskMetricFilter, TASK_METRIC_FILTER_LABELS } from '../../constants/taskFilters';
import { getApiErrorMessage } from '../../utils/errors';
import { useAuthStore } from '../../store/authStore';
import TaskQueueStatusBanner from '../../components/TaskQueueStatusBanner';

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

function toTimestamp(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function compareCreatedAtDesc(a: Task, b: Task) {
  const createdA = toTimestamp(a.createdAt) ?? 0;
  const createdB = toTimestamp(b.createdAt) ?? 0;
  return createdB - createdA;
}


function completedTaskSortValue(task: Task) {
  return toTimestamp(task.completedAt ?? task.updatedAt ?? task.createdAt) ?? 0;
}

function compareCompletedTaskOrder(a: Task, b: Task) {
  const completedDiff = completedTaskSortValue(b) - completedTaskSortValue(a);
  if (completedDiff !== 0) return completedDiff;

  return compareCreatedAtDesc(a, b);
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

function formatDate(iso?: string | null, dueTime?: string | null) {
  if (!iso) return 'No due date';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No due date';
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (dueTime && dueTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) {
    const [hours, minutes] = dueTime.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    const timeStr = `${displayH}:${m.toString().padStart(2, '0')} ${suffix}`;
    return `${dateStr} ${timeStr}`;
  }
  return dateStr;
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
  const taskBar = buildTaskBarModel(task);
  const imageCount = getTaskAttachmentUrls(task, 'images').length;
  const videoCount = getTaskAttachmentUrls(task, 'videos').length;
  const audioCount = getTaskAttachmentUrls(task, 'audios').length;
  const fileCount = getTaskAttachmentUrls(task, 'files').length;

  return (
    <TouchableOpacity style={styles.openCard} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.openCardInner}>
        <View style={styles.openCardTopRow}>
          <TaskBadgeRow task={task} />
          {outletName ? <Text style={styles.openCardOutletName} numberOfLines={1}>{outletName}</Text> : null}
        </View>

        <Text style={styles.openTitle} numberOfLines={2}>
          {taskBar.title}
        </Text>
        <Text style={styles.openMetaLine} numberOfLines={1}>
          <Text style={styles.openMetaLabel}>Assigned to: </Text>
          <Text style={styles.openMetaStrong}>{taskBar.assigneeLabel}</Text>
        </Text>
        <Text style={styles.openMetaLine} numberOfLines={1}>
          <Text style={styles.openMetaLabel}>Due: </Text>
          <Text style={styles.openMetaStrong}>{formatDate(task.dueDate, task.dueTime)}</Text>
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
  const outletName = getTaskOutletName(task);
  const taskBar = buildTaskBarModel(task);
  const imageCount = getTaskAttachmentUrls(task, 'images').length;
  const videoCount = getTaskAttachmentUrls(task, 'videos').length;
  const audioCount = getTaskAttachmentUrls(task, 'audios').length;
  const fileCount = getTaskAttachmentUrls(task, 'files').length;

  return (
    <TouchableOpacity style={styles.completedCard} onPress={onPress} activeOpacity={0.78}>
      <View style={styles.openCardTopRow}>
        <TaskBadgeRow task={task} />
        {outletName ? <Text style={styles.openCardOutletName} numberOfLines={1}>{outletName}</Text> : null}
      </View>
      <Text style={styles.completedWhen}>{formatRelativeTime(task.completedAt)}</Text>

      <Text style={styles.openTitle} numberOfLines={2}>
        {taskBar.title}
      </Text>
      <Text style={styles.openMetaLine} numberOfLines={1}>
        <Text style={styles.openMetaLabel}>Assigned to: </Text>
        <Text style={styles.openMetaStrong}>{taskBar.assigneeLabel}</Text>
      </Text>
      <Text style={styles.openMetaLine} numberOfLines={1}>
        <Text style={styles.openMetaLabel}>Due: </Text>
        <Text style={styles.openMetaStrong}>{formatDate(task.dueDate, task.dueTime)}</Text>
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
  const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const userIdentifier = user?._id || user?.id;
  const navigation = useNavigation<Nav>();
  const route = useRoute<TasksRoute>();
  const [activeTab, setActiveTab] = useState<'NORMAL' | 'RECURRING'>('NORMAL');
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
      isRecurring: activeTab === 'RECURRING',
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
      isRecurring: activeTab === 'RECURRING',
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
    () => {
      const isRecTab = activeTab === 'RECURRING';
      return (openTasksQuery.data?.pages ?? [])
        .flatMap((page) => page.data)
        .filter((task) => !!task.isRecurring === isRecTab);
    },
    [openTasksQuery.data?.pages, activeTab],
  );
  const completedTasksFromApi = useMemo(
    () => {
      const isRecTab = activeTab === 'RECURRING';
      return (completedTasksQuery.data?.pages ?? [])
        .flatMap((page) => page.data)
        .filter((task) => !!task.isRecurring === isRecTab);
    },
    [completedTasksQuery.data?.pages, activeTab],
  );

  const openTasks = useMemo(() => {
    return [...openTasksFromApi].sort(compareCreatedAtDesc);
  }, [openTasksFromApi]);

  const completedTasks = useMemo(
    () => [...completedTasksFromApi].sort(compareCompletedTaskOrder),
    [completedTasksFromApi],
  );
  const openTasksTotal = openTasks.length;
  const completedTasksTotal = completedTasks.length;

  const formatFilterDate = (date: Date) => date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const onDueDateChange = (selectedDate: Date) => {
    setDueDateFilter(selectedDate);
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

  const openExternalAttachment = async (url: string, type?: AttachmentType) => {
    const trimmedUrl = url.trim();
    // Handle PDF and other files specifically to open in-app
    const isPdf = trimmedUrl.toLowerCase().split('?')[0].endsWith('.pdf');
    if (isPdf || type === 'files') {
      try {
        const fileName = trimmedUrl.split('/').pop()?.split('?')[0] || `document-${Date.now()}`;
        const localUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        const downloadRes = await FileSystem.downloadAsync(trimmedUrl, localUri);
        
        if (downloadRes.status === 200) {
          const sharingAvailable = await Sharing.isAvailableAsync();
          if (sharingAvailable) {
            await Sharing.shareAsync(downloadRes.uri, {
              dialogTitle: isPdf ? 'Open PDF' : 'Open File',
            });
            return;
          }
        }
      } catch (error) {
        console.warn('[Tasks] Failed to open file in-app', error);
      }
    }

    try {
      const canOpen = await Linking.canOpenURL(trimmedUrl);
      if (!canOpen) {
        Alert.alert('Attachment unavailable', 'Could not open this attachment.');
        return;
      }
      await Linking.openURL(trimmedUrl);
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
        <View style={{ flexShrink: 1, marginRight: spacing.sm }}>
          <Text style={styles.heading} numberOfLines={1}>Task Board</Text>
          <Text style={styles.subheading} numberOfLines={1}>Manage operational flows</Text>
        </View>
        <View style={styles.headerBtns}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('TaskCategories')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>Categories</Text>
            </TouchableOpacity>
          )}
          {!isManager && (
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)} activeOpacity={0.84}>
              <Text style={styles.createBtnText}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <TaskQueueStatusBanner />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'NORMAL' && styles.tabItemActive]}
          onPress={() => setActiveTab('NORMAL')}
        >
          <Text style={[styles.tabText, activeTab === 'NORMAL' && styles.tabTextActive]}>Normal Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'RECURRING' && styles.tabItemActive]}
          onPress={() => setActiveTab('RECURRING')}
        >
          <Text style={[styles.tabText, activeTab === 'RECURRING' && styles.tabTextActive]}>Recurring Task</Text>
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
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
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

              <ScrollView
                style={styles.filterContent}
                contentContainerStyle={{ paddingBottom: spacing.lg }}
                showsVerticalScrollIndicator={false}
              >
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

                    {!showDueDatePicker && (
                      <TouchableOpacity
                        style={styles.filterActionBtn}
                        onPress={() => setShowDueDatePicker(true)}
                        activeOpacity={0.82}
                      >
                        <Text style={styles.filterActionBtnText}>{dueDateFilter ? 'Change Date' : 'Select Date'}</Text>
                      </TouchableOpacity>
                    )}

                    {dueDateFilter && !showDueDatePicker && (
                      <TouchableOpacity
                        style={[styles.filterActionBtn, styles.filterActionBtnSecondary]}
                        onPress={() => setDueDateFilter(null)}
                        activeOpacity={0.82}
                      >
                        <Text style={[styles.filterActionBtnText, styles.filterActionBtnSecondaryText]}>Clear Date</Text>
                      </TouchableOpacity>
                    )}

                    <DatePickerModal
                      visible={showDueDatePicker}
                      value={dueDateFilter ?? new Date()}
                      onClose={() => setShowDueDatePicker(false)}
                      onChange={onDueDateChange}
                    />
                  </View>
                )}
              </ScrollView>
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
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <CreateTaskContent
              onSuccess={() => {
                setShowCreateModal(false);
                void refetch();
              }}
              initialIsRecurring={activeTab === 'RECURRING'}
              hideRecurringToggle
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
                    onPress={() => { void openExternalAttachment(url, attachmentModal?.type); }}
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
                    onPress={() => { void openExternalAttachment(url, attachmentModal?.type); }}
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

      {/* Persistent Sticky Completed Tasks Accordion */}
      {showCompletedSection && (
        <View style={[
          styles.accordionContainer,
          showCompletedAccordion && styles.accordionContainerExpanded
        ]}>
          <TouchableOpacity
            style={styles.completedAccordionToggle}
            onPress={() => setShowCompletedAccordion(!showCompletedAccordion)}
            activeOpacity={0.9}
          >
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.sectionDot, styles.sectionDotCompleted, { marginRight: spacing.sm }]} />
              <Text style={styles.accordionTitle}>Completed Tasks</Text>
              <View style={styles.accordionCountBadge}>
                <Text style={styles.accordionCountText}>{completedTasksTotal}</Text>
              </View>
            </View>
            <Ionicons
              name={showCompletedAccordion ? "chevron-down" : "chevron-up"}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showCompletedAccordion && (
            <View style={styles.accordionContentHorizontal}>
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
            </View>
          )}
        </View>
      )}
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
  headerBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
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
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D3C5AC80',
    backgroundColor: colors.buttonLightBg,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
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
    paddingTop: spacing.sm,
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
    paddingTop: spacing.xs,
    paddingBottom: 170, // Padding for floating tab bar (96) + accordion toggle (56)
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
  openCardInner: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  openCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
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
    paddingHorizontal: spacing.md, // Added horizontal padding for first/last card
    paddingBottom: spacing.sm,
    paddingRight: spacing.md,
  },
  completedCard: {
    width: 280,
    backgroundColor: '#F0F2F5',
    borderRadius: radius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#D3C5AC2A',
    gap: spacing.xs,
    marginRight: spacing.sm,
    alignSelf: 'flex-start',
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
    maxHeight: '88%',
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
    width: 28,
    height: 28,
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
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: 4,
    marginBottom: spacing.xs,
    backgroundColor: '#E6E8EA',
    borderRadius: radius.md,
    padding: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  tabText: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.bold,
  },
  accordionContainer: {
    position: 'absolute',
    bottom: 96, // Sits directly on top of the floating tab bar (76 height + 20 bottom)
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  accordionContainerExpanded: {
    // Container will expand to fit the fixed-height horizontal list
  },
  completedAccordionToggle: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  accordionContentHorizontal: {
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  accordionCountBadge: {
    backgroundColor: '#EEF1F4',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  accordionCountText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: colors.textSecondary,
  },
  accordionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  accordionCloseBtn: {
    padding: spacing.xs,
  },
  accordionModalTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
  },
  accordionListContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
});
