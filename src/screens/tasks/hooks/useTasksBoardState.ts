import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Task, TaskPriority } from '../../../api/endpoints/tasks';
import { TaskMetricFilter } from '../../../constants/taskFilters';
import { useInfiniteTasks, useUnreadIds } from '../../../hooks/tasks';
import { TasksStackParamList } from '../../../navigation/TasksNavigator';
import { useAuthStore } from '../../../store/authStore';
import { getApiErrorMessage } from '../../../utils/errors';

import { useTaskCounters } from './useTaskCounters';

type Nav = NativeStackNavigationProp<TasksStackParamList, 'TasksList'>;
type TasksRoute = RouteProp<TasksStackParamList, 'TasksList'>;
export type PriorityFilter = TaskPriority | 'ALL';
export type FilterSection = 'priority' | 'dueDate';
export type AttachmentType = 'images' | 'videos' | 'audios' | 'files';

export function toTimestamp(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

export function compareCreatedAtDesc(a: Task, b: Task) {
  const createdA = toTimestamp(a.createdAt) ?? 0;
  const createdB = toTimestamp(b.createdAt) ?? 0;
  return createdB - createdA;
}

export function completedTaskSortValue(task: Task) {
  return toTimestamp(task.completedAt ?? task.updatedAt ?? task.createdAt) ?? 0;
}

export function compareCompletedTaskOrder(a: Task, b: Task) {
  const completedDiff = completedTaskSortValue(b) - completedTaskSortValue(a);
  if (completedDiff !== 0) return completedDiff;
  return compareCreatedAtDesc(a, b);
}

export function buildAttachmentName(url: string, prefix: string, index: number) {
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

export function getTaskAttachmentUrls(task: Task, type: AttachmentType) {
  if (type === 'images') return task.attachments?.images ?? task.imageUrls ?? [];
  if (type === 'videos') return task.attachments?.videos ?? [];
  if (type === 'audios') return task.attachments?.audios ?? [];
  return task.attachments?.files ?? [];
}

export function formatDate(iso?: string | null, dueTime?: string | null) {
  if (!iso) return 'No due date';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No due date';
  const dateStr = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

export function formatRelativeTime(iso?: string | null) {
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

export function formatDueDisplay(dueDateStr?: string | null, dueTime?: string | null) {
  if (!dueDateStr) return 'No due date';
  const date = new Date(dueDateStr);
  if (Number.isNaN(date.getTime())) return 'No due date';

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  let timeStr = '';
  if (dueTime && dueTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/)) {
    const [hours, minutes] = dueTime.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    timeStr = `${displayH}:${m.toString().padStart(2, '0')} ${suffix}`;
  }

  if (isToday) {
    return timeStr ? `Due: ${timeStr}` : 'Due: Today';
  }
  if (isTomorrow) {
    return `Due: Tomorrow${timeStr ? ` ${timeStr}` : ''}`;
  }

  const datePart = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `Due: ${datePart}${timeStr ? ` ${timeStr}` : ''}`;
}

export function useTasksBoardState() {
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
  const [attachmentModal, setAttachmentModal] = useState<{
    task: Task;
    type: AttachmentType;
  } | null>(null);
  const [lastLoadError, setLastLoadError] = useState('');

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TODAY' | 'UNREAD' | 'HIGH_PRIORITY'>(
    'ALL',
  );

  useEffect(() => {
    const incomingMetric = route.params?.initialTaskFilter?.metric;
    if (incomingMetric === 'critical') {
      queueMicrotask(() => setActiveFilter('HIGH_PRIORITY'));
    } else if (incomingMetric === 'due_today') {
      queueMicrotask(() => setActiveFilter('TODAY'));
    }
  }, [route.params?.initialTaskFilter?.metric, route.params?.initialTaskFilter?.nonce]);

  const showOpenSection = metricFilter !== 'resolved';
  const showCompletedSection = metricFilter === 'all' || metricFilter === 'resolved';

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const { todayCount, highPriorityCount, refetchTodayCount, refetchHighPriorityCount } =
    useTaskCounters(activeTab, userIdentifier, isAdmin);

  const effectivePriorityFilter: TaskPriority | undefined =
    activeFilter === 'HIGH_PRIORITY'
      ? 'HIGH'
      : priorityFilter === 'ALL'
        ? undefined
        : priorityFilter;

  const effectiveOpenDueDateStart =
    activeFilter === 'TODAY'
      ? todayStart
      : dueDateFilter
        ? new Date(dueDateFilter.getFullYear(), dueDateFilter.getMonth(), dueDateFilter.getDate())
        : null;
  const effectiveOpenDueDateEnd =
    activeFilter === 'TODAY'
      ? todayEnd
      : effectiveOpenDueDateStart
        ? new Date(effectiveOpenDueDateStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        : null;

  const effectiveCompletedDueDateStart = useMemo(
    () =>
      dueDateFilter
        ? new Date(dueDateFilter.getFullYear(), dueDateFilter.getMonth(), dueDateFilter.getDate())
        : null,
    [dueDateFilter],
  );
  const effectiveCompletedDueDateEnd = useMemo(
    () =>
      effectiveCompletedDueDateStart
        ? new Date(effectiveCompletedDueDateStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        : null,
    [effectiveCompletedDueDateStart],
  );

  const unreadPriorityFilter: TaskPriority | undefined =
    priorityFilter === 'ALL' ? undefined : priorityFilter;
  const unreadIdsQuery = useMemo(
    () => ({
      status: 'OPEN' as const,
      priority: unreadPriorityFilter,
      search: debouncedSearchQuery || undefined,
      dueFrom: effectiveCompletedDueDateStart
        ? effectiveCompletedDueDateStart.toISOString()
        : undefined,
      dueTo: effectiveCompletedDueDateEnd ? effectiveCompletedDueDateEnd.toISOString() : undefined,
      assigneeId: isAdmin ? undefined : userIdentifier,
      isRecurring: activeTab === 'RECURRING',
    }),
    [
      unreadPriorityFilter,
      debouncedSearchQuery,
      effectiveCompletedDueDateStart,
      effectiveCompletedDueDateEnd,
      isAdmin,
      userIdentifier,
      activeTab,
    ],
  );

  const { data: unreadIds = [], refetch: refetchUnreadIds } = useUnreadIds(unreadIdsQuery);
  const unreadSet = useMemo(() => new Set(unreadIds), [unreadIds]);

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
      dueFrom: effectiveCompletedDueDateStart
        ? effectiveCompletedDueDateStart.toISOString()
        : undefined,
      dueTo: effectiveCompletedDueDateEnd ? effectiveCompletedDueDateEnd.toISOString() : undefined,
      assigneeId: isAdmin ? undefined : userIdentifier,
      isRecurring: activeTab === 'RECURRING',
    },
    { enabled: showCompletedSection },
  );

  const { refetch: refetchOpen } = openTasksQuery;
  const { refetch: refetchCompleted } = completedTasksQuery;

  useFocusEffect(
    React.useCallback(() => {
      void refetchUnreadIds();
      void refetchOpen();
      void refetchCompleted();
      void refetchTodayCount();
      void refetchHighPriorityCount();
    }, [
      refetchUnreadIds,
      refetchOpen,
      refetchCompleted,
      refetchTodayCount,
      refetchHighPriorityCount,
    ]),
  );

  useEffect(() => {
    const incomingMetric = route.params?.initialTaskFilter?.metric;
    if (!incomingMetric) return;
    queueMicrotask(() => setMetricFilter(incomingMetric));
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
      if (lastLoadError) queueMicrotask(() => setLastLoadError(''));
      return;
    }
    const message = getApiErrorMessage(
      openError ?? completedError,
      'Could not apply filters. Please try again.',
    );
    if (message === lastLoadError) return;
    queueMicrotask(() => setLastLoadError(message));
    Alert.alert('Could not load tasks', message);
  }, [openTasksQuery.error, completedTasksQuery.error, lastLoadError]);

  const openTasksFromApi = useMemo(() => {
    const isRecTab = activeTab === 'RECURRING';
    return (openTasksQuery.data?.pages ?? [])
      .flatMap((page) => page.data)
      .filter((task) => !!task.isRecurring === isRecTab);
  }, [openTasksQuery.data?.pages, activeTab]);
  const completedTasksFromApi = useMemo(() => {
    const isRecTab = activeTab === 'RECURRING';
    return (completedTasksQuery.data?.pages ?? [])
      .flatMap((page) => page.data)
      .filter((task) => !!task.isRecurring === isRecTab);
  }, [completedTasksQuery.data?.pages, activeTab]);

  const openTasks = useMemo(() => {
    let list = [...openTasksFromApi].sort(compareCreatedAtDesc);
    if (activeFilter === 'UNREAD') {
      list = list.filter((task) => unreadSet.has(task.id));
    }
    return list;
  }, [openTasksFromApi, activeFilter, unreadSet]);

  const completedTasks = useMemo(
    () => [...completedTasksFromApi].sort(compareCompletedTaskOrder),
    [completedTasksFromApi],
  );

  const openTasksTotal = openTasks.length;
  const completedTasksTotal = completedTasks.length;

  const formatFilterDate = (date: Date) =>
    date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const onDueDateChange = (selectedDate: Date) => {
    setDueDateFilter(selectedDate);
  };

  const refetch = async () => {
    const refetchers: (() => Promise<unknown>)[] = [];
    if (showOpenSection) refetchers.push(() => openTasksQuery.refetch());
    if (showCompletedSection) refetchers.push(() => completedTasksQuery.refetch());
    refetchers.push(() => refetchUnreadIds());
    await Promise.all(refetchers.map((run) => run()));
  };

  const isLoading = showOpenSection
    ? openTasksQuery.isLoading || (showCompletedSection && completedTasksQuery.isLoading)
    : completedTasksQuery.isLoading;
  const isFetching = showOpenSection
    ? openTasksQuery.isFetching || (showCompletedSection && completedTasksQuery.isFetching)
    : completedTasksQuery.isFetching;

  const openAttachmentModal = (task: Task, type: AttachmentType) => {
    const urls = getTaskAttachmentUrls(task, type);
    if (urls.length === 0) {
      Alert.alert('No attachments', `No ${type} found for this task.`);
      return;
    }
    setAttachmentModal({ task, type });
  };

  const getDeterministicFileNameFromUrl = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return `document-${hash}`;
  };

  const openExternalAttachment = async (url: string, type?: AttachmentType) => {
    const trimmedUrl = url.trim();
    const isPdf = trimmedUrl.toLowerCase().split('?')[0].endsWith('.pdf');
    if (isPdf || type === 'files') {
      try {
        const fileName =
          trimmedUrl.split('/').pop()?.split('?')[0] || getDeterministicFileNameFromUrl(trimmedUrl);
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

  return {
    // User / nav
    user,
    isAdmin,
    isManager,
    userIdentifier,
    navigation,
    route,

    // Tab
    activeTab,
    setActiveTab,

    // Filters
    activeFilter,
    setActiveFilter,
    priorityFilter,
    setPriorityFilter,
    dueDateFilter,
    setDueDateFilter,
    metricFilter,
    setMetricFilter,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,

    // Filter modal
    showFilterModal,
    setShowFilterModal,
    activeFilterSection,
    setActiveFilterSection,
    showDueDatePicker,
    setShowDueDatePicker,

    // Create / accordion / attachment
    showCreateModal,
    setShowCreateModal,
    showCompletedAccordion,
    setShowCompletedAccordion,
    attachmentModal,
    setAttachmentModal,

    // Loading / error
    lastLoadError,

    // Counts
    todayCount,
    highPriorityCount,

    // Queries & derived data
    openTasksQuery,
    completedTasksQuery,
    openTasks,
    completedTasks,
    openTasksTotal,
    completedTasksTotal,
    isLoading,
    isFetching,
    showOpenSection,
    showCompletedSection,

    // Unread
    unreadIds,
    unreadSet,

    // Computed values
    effectivePriorityFilter,
    todayStart,
    todayEnd,
    formatFilterDate,

    // Actions
    onDueDateChange,
    openAttachmentModal,
    openExternalAttachment,
    refetch,
    refetchUnreadIds,
  };
}
