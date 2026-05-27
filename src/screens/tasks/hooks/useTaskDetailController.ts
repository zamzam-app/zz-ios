import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Linking } from 'react-native';

import { TaskStatus } from '../../../api/endpoints/tasks';
import { uploadToCloudinary } from '../../../api/endpoints/uploads';
import {
  useAddAttachments,
  useAddComment,
  useTask,
  useTaskDetail,
  useTaskTimeline,
  useEventTypeCounts,
  useMarkTaskViewed,
  useUpdateTaskStatus,
  useDeleteTask,
} from '../../../hooks/tasks';
import { useAuthStore } from '../../../store/authStore';
import { AttachmentType, TaskEventType } from '../../../types/task';
import type { AttachmentPreview, TaskAttachment } from '../../../types/task';
import { getApiErrorMessage } from '../../../utils/errors';
import { flattenInfiniteData } from '../../../utils/pagination';

import { useTaskAudioController } from './useTaskAudioController';

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_STATUSES: TaskStatus[] = ['OPEN', 'COMPLETED'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Open',
  COMPLETED: 'Completed',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#E04F4F',
  MEDIUM: '#E09E4F',
  LOW: '#4FA85A',
};

// ─── Helper functions ───────────────────────────────────────────────────────

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function readStringId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function getTaskIdFromSource(sourceValue: unknown): string {
  const rec = asRecord(sourceValue);
  if (!rec) return '';
  return readStringId(rec._id ?? rec.id);
}

function getAxiosLikeErrorDetails(error: unknown) {
  const rec = asRecord(error);
  const response = rec ? asRecord(rec.response) : null;
  const config = rec ? asRecord(rec.config) : null;
  return {
    message: rec && typeof rec.message === 'string' ? rec.message : undefined,
    status: response && typeof response.status === 'number' ? response.status : undefined,
    statusText:
      response && typeof response.statusText === 'string' ? response.statusText : undefined,
    responseData: response ? response.data : undefined,
    url: config && typeof config.url === 'string' ? config.url : undefined,
    method: config && typeof config.method === 'string' ? config.method : undefined,
  };
}

function isNotFoundApiError(error: unknown) {
  return getAxiosLikeErrorDetails(error).status === 404;
}

function buildAttachmentName(url: string, prefix: string, index: number) {
  const safePrefix = prefix.toLowerCase();
  try {
    const parsed = new URL(url);
    const fileName = parsed.pathname.split('/').pop();
    if (fileName) return decodeURIComponent(fileName);
  } catch {
    // Fallback for non-URL strings.
  }
  const fallbackPart = url.split('/').pop()?.split('?')[0];
  if (fallbackPart) return decodeURIComponent(fallbackPart);
  return `${safePrefix}-${index + 1}`;
}

function formatDate(iso?: string | null, dueTime?: string | null) {
  if (!iso) return 'Not set';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not set';
  const dateStr = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
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

function cloudinaryThumbnail(url: string, width = 200, height = 200): string {
  if (!url.includes('cloudinary')) return url;
  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill/`);
}

export {
  PRIORITY_COLORS,
  buildAttachmentName,
  formatDate,
  cloudinaryThumbnail,
  getTaskIdFromSource,
  readStringId,
  asRecord,
  STATUS_LABELS,
};

// ─── SubmissionBlock-style extracted function ───────────────────────────────

function getSourceAttachments(
  sourceValue: unknown,
  managerAudios: string[],
): {
  images: string[];
  videos: string[];
  savedAudios: string[];
  audios: string[];
  files: string[];
  audioMeta: { id: string; url: string }[];
  audioIdsKey: string;
  count: number;
  hasAny: boolean;
} {
  const rec = asRecord(sourceValue) ?? {};
  const attachments = asRecord(rec.attachments) ?? {};
  const adminSubmission = asRecord(rec.adminSubmission) ?? {};
  const adminAttachments = asRecord(adminSubmission.attachments) ?? {};
  const imageUrls = Array.isArray(rec.imageUrls) ? rec.imageUrls : [];

  const images = Array.from(
    new Set([
      ...(Array.isArray(attachments.images) ? (attachments.images as string[]) : imageUrls),
      ...(Array.isArray(adminAttachments.images) ? (adminAttachments.images as string[]) : []),
    ]),
  );
  const videos = Array.from(
    new Set([
      ...(Array.isArray(attachments.videos) ? (attachments.videos as string[]) : []),
      ...(Array.isArray(adminAttachments.videos) ? (adminAttachments.videos as string[]) : []),
    ]),
  );
  const savedAudios = Array.from(
    new Set([
      ...(Array.isArray(attachments.audios) ? (attachments.audios as string[]) : []),
      ...(Array.isArray(adminAttachments.audios) ? (adminAttachments.audios as string[]) : []),
    ]),
  );
  const audios = Array.from(new Set([...savedAudios, ...managerAudios]));
  const files = Array.from(
    new Set([
      ...(Array.isArray(attachments.files) ? (attachments.files as string[]) : []),
      ...(Array.isArray(adminAttachments.files) ? (adminAttachments.files as string[]) : []),
    ]),
  );
  const audioMeta = audios.map((url: string, index: number) => ({
    id: `audio-${index}-${url}`,
    url,
  }));
  const audioIds = audioMeta.map((item) => item.id);
  const audioIdsKey = audioIds.join('|');
  const count = images.length + videos.length + savedAudios.length + files.length;
  return {
    images,
    videos,
    savedAudios,
    audios,
    files,
    audioMeta,
    audioIdsKey,
    count,
    hasAny: count > 0,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTaskDetailController(
  taskId: string,
  navigation: { goBack: () => void; canGoBack: () => boolean; navigate: (route: string) => void },
) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  // ─── Data fetching ──────────────────────────────────────────────────────
  const {
    data: taskDetail,
    isLoading: detailLoading,
    status: detailStatus,
    error: detailError,
    refetch: refetchDetail,
  } = useTaskDetail(taskId);
  const timelineQuery = useTaskTimeline(taskId);
  const eventTypeCountsQuery = useEventTypeCounts(taskId);
  const addAttachmentsMutation = useAddAttachments();
  const addCommentMutation = useAddComment();
  const { mutate: mutateMarkTaskViewed } = useMarkTaskViewed();

  const {
    data: legacyTask,
    isLoading: legacyLoading,
    status: legacyStatus,
    error: legacyError,
    refetch: refetchLegacy,
  } = useTask(taskId);

  // ─── Mark task viewed on focus...

  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  // ─── Modal state ────────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [showDelegationSheet, setShowDelegationSheet] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // ─── Manager submission state ───────────────────────────────────────────
  const [managerText, setManagerText] = useState('');
  const [managerAttachments, setManagerAttachments] = useState<{
    images: string[];
    videos: string[];
    audios: string[];
    files: string[];
  }>({ images: [], videos: [], audios: [], files: [] });
  const [uploadingType, setUploadingType] = useState<
    null | 'images' | 'videos' | 'audios' | 'files'
  >(null);

  // ─── Mark task viewed on focus ──────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      mutateMarkTaskViewed(taskId);
    }, [mutateMarkTaskViewed, taskId]),
  );

  // ─── Derived: source data ───────────────────────────────────────────────
  const source = taskDetail?.summary ?? legacyTask;

  const completedAtIso = useMemo(() => {
    const rec = asRecord(source);
    return rec && typeof rec.completedAt === 'string' ? rec.completedAt : null;
  }, [source]);

  const resolvedOutletId = useMemo(() => {
    const rec = asRecord(source);
    if (!rec) return '';
    if (typeof rec.outletId === 'string' && rec.outletId) return rec.outletId;
    const outlet = asRecord(rec.outlet);
    const outletId = outlet ? readStringId(outlet._id) : '';
    return outletId || '';
  }, [source]);

  const sourceAttachments = useMemo(
    () => getSourceAttachments(source, managerAttachments.audios),
    [source, managerAttachments.audios],
  );

  const timelineEvents = useMemo(() => {
    const rawEvents = flattenInfiniteData(timelineQuery.data);
    const seenEventKeys = new Set<string>();
    const deduped: typeof rawEvents = [];

    for (const event of rawEvents) {
      const eventKey =
        event._id && event.sortKey
          ? `${event._id}:${event.sortKey}`
          : `${event.type}:${event.createdAt}:${event.createdBy._id}`;
      if (seenEventKeys.has(eventKey)) continue;
      seenEventKeys.add(eventKey);
      deduped.push(event);
    }

    const clubbed: typeof rawEvents = [];
    for (const event of deduped) {
      if (event.type === TaskEventType.ATTACHMENT_ADDED) {
        const lastEvent = clubbed[clubbed.length - 1];
        if (
          lastEvent &&
          lastEvent.type === TaskEventType.ATTACHMENT_ADDED &&
          lastEvent.createdBy._id === event.createdBy._id
        ) {
          const prevPreviews = lastEvent.attachmentPreviews || [];
          const currPreviews = event.attachmentPreviews || [];
          lastEvent.attachmentPreviews = [...prevPreviews, ...currPreviews];
          continue;
        }
      }
      clubbed.push({
        ...event,
        attachmentPreviews: event.attachmentPreviews ? [...event.attachmentPreviews] : undefined,
      });
    }

    return clubbed;
  }, [timelineQuery.data]);

  // ─── Audio controller ───────────────────────────────────────────────────
  const audioController = useTaskAudioController(
    sourceAttachments.audioMeta,
    sourceAttachments.audioIdsKey,
  );

  const handleTimelineAudioPress = useCallback(
    (url: string) => {
      audioController.handleAudioAttachmentPress(url, url);
    },
    [audioController.handleAudioAttachmentPress],
  );

  // ─── Manager submission init from source ────────────────────────────────
  useEffect(() => {
    if (!source) return;
    const rec = asRecord(source);
    const managerSubmission = rec ? asRecord(rec.managerSubmission) : null;
    const managerAttachmentsValue = managerSubmission
      ? asRecord(managerSubmission.attachments)
      : null;
    const nextText =
      managerSubmission && typeof managerSubmission.text === 'string' ? managerSubmission.text : '';
    const nextAttachments = {
      images: Array.isArray(managerAttachmentsValue?.images)
        ? (managerAttachmentsValue?.images as string[])
        : [],
      videos: Array.isArray(managerAttachmentsValue?.videos)
        ? (managerAttachmentsValue?.videos as string[])
        : [],
      audios: Array.isArray(managerAttachmentsValue?.audios)
        ? (managerAttachmentsValue?.audios as string[])
        : [],
      files: Array.isArray(managerAttachmentsValue?.files)
        ? (managerAttachmentsValue?.files as string[])
        : [],
    };
    queueMicrotask(() => {
      setManagerText(nextText);
      setManagerAttachments(nextAttachments);
    });
  }, [source]);

  useEffect(() => {
    if (detailError) {
      const err = getAxiosLikeErrorDetails(detailError);
      console.error('[TaskDetailScreen] Error fetching task detail for taskId:', taskId, {
        message: err.message,
        status: err.status,
        statusText: err.statusText,
        responseData: err.responseData,
        url: err.url,
        method: err.method,
        error: detailError,
      });
    }
  }, [detailError, taskId]);

  useEffect(() => {
    if (timelineQuery.error) {
      const err = getAxiosLikeErrorDetails(timelineQuery.error);
      console.error('[TaskDetailScreen] Error fetching timeline for taskId:', taskId, {
        message: err.message,
        status: err.status,
        responseData: err.responseData,
        url: err.url,
        method: err.method,
      });
    }
  }, [timelineQuery.error, taskId]);

  useEffect(() => {
    if (eventTypeCountsQuery.error) {
      const err = getAxiosLikeErrorDetails(eventTypeCountsQuery.error);
      console.error('[TaskDetailScreen] Error fetching event type counts for taskId:', taskId, {
        message: err.message,
        status: err.status,
        responseData: err.responseData,
        url: err.url,
        method: err.method,
      });
    }
  }, [eventTypeCountsQuery.error, taskId]);

  // ─── Action handlers ────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('TasksList');
  }, [navigation]);

  const handleStatusChange = useCallback(() => {
    if (!source) return;

    const taskIdForUpdate = getTaskIdFromSource(source);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...ALL_STATUSES.map((s) => STATUS_LABELS[s]), 'Cancel'],
        cancelButtonIndex: ALL_STATUSES.length,
        title: 'Update Status',
      },
      (idx) => {
        if (idx < ALL_STATUSES.length) {
          updateStatus.mutate({ id: taskIdForUpdate, status: ALL_STATUSES[idx] });
        }
      },
    );
  }, [source, updateStatus]);

  const handleDelete = useCallback(() => {
    Alert.alert('Delete Task', 'Are you sure? This action cannot be undone.', [
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
  }, [deleteTask, taskId, navigation]);

  const openAttachment = useCallback(
    async (url: string, type?: 'image' | 'video' | 'audio' | 'file') => {
      const trimmedUrl = url.trim();
      if (type === 'image') {
        setViewerImageUrl(trimmedUrl);
        return;
      }

      try {
        // ── File/document handling ────────────────────────────────────────
        if (type === 'file') {
          await WebBrowser.openBrowserAsync(trimmedUrl);
          return;
        }

        // ── Video/audio handling ─────────────────────────────────────────
        if (audioController.probingAudioAttachmentId) {
          audioController.setActiveAudioAttachmentId(null);
        }
        if (audioController.activeAudioAttachmentId) {
          if (audioController.previewPlayerStatus.playing) {
            audioController.runPreviewPlayerActionSafely(() =>
              audioController.previewPlayer.pause(),
            );
          }
          audioController.setActiveAudioAttachmentId(null);
        }
        const canOpen = await Linking.canOpenURL(trimmedUrl);
        if (!canOpen) {
          Alert.alert('Cannot open file', 'This file type is not supported on this device.');
          return;
        }
        await Linking.openURL(trimmedUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[TaskDetailScreen] Failed to open attachment:', message, {
          url: trimmedUrl.slice(0, 80),
          type,
        });

        Alert.alert('Attachment unavailable', 'Could not open this attachment.');
      }
    },
    [audioController],
  );

  const addAttachmentUrl = useCallback(
    (type: 'images' | 'videos' | 'audios' | 'files', url: string) => {
      setManagerAttachments((prev) => ({
        ...prev,
        [type]: [...prev[type], url],
      }));
    },
    [],
  );

  const removeAttachmentUrl = useCallback(
    (type: 'images' | 'videos' | 'audios' | 'files', index: number) => {
      setManagerAttachments((prev) => ({
        ...prev,
        [type]: prev[type].filter((_, idx) => idx !== index),
      }));
    },
    [],
  );

  const uploadLocalFile = useCallback(
    async (type: 'images' | 'videos' | 'audios' | 'files', uri: string) => {
      setUploadingType(type);
      try {
        const remoteUrl = await uploadToCloudinary(uri, 'tasks');
        addAttachmentUrl(type, remoteUrl);
      } catch (error) {
        Alert.alert('Upload failed', getApiErrorMessage(error, 'Could not upload attachment.'));
      } finally {
        setUploadingType(null);
      }
    },
    [addAttachmentUrl],
  );

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('images', result.assets[0].uri);
  }, [uploadLocalFile]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('images', result.assets[0].uri);
  }, [uploadLocalFile]);

  const pickVideo = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('videos', result.assets[0].uri);
  }, [uploadLocalFile]);

  const pickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('files', result.assets[0].uri);
  }, [uploadLocalFile]);

  const saveManagerSubmission = useCallback(async () => {
    if (!source) return;
    const taskIdForUpdate = getTaskIdFromSource(source);

    const hasText = managerText.trim().length > 0;
    const files: { url: string; type: AttachmentType }[] = [];
    managerAttachments.images.forEach((url) => files.push({ url, type: AttachmentType.IMAGE }));
    managerAttachments.videos.forEach((url) => files.push({ url, type: AttachmentType.VIDEO }));
    managerAttachments.audios.forEach((url) => files.push({ url, type: AttachmentType.AUDIO }));
    managerAttachments.files.forEach((url) => {
      const isPdf = url.toLowerCase().endsWith('.pdf');
      files.push({ url, type: isPdf ? AttachmentType.DOCUMENT : AttachmentType.FILE });
    });
    const hasAttachments = files.length > 0;

    if (!hasText && !hasAttachments) {
      setShowSubmissionModal(false);
      return;
    }

    try {
      let uploadedAttachments: TaskAttachment[] = [];
      if (hasAttachments) {
        uploadedAttachments = await addAttachmentsMutation.mutateAsync({
          taskId: taskIdForUpdate,
          payload: { files },
        });
      }

      if (hasText) {
        const attachmentIds = uploadedAttachments
          .map((att) => readStringId(att._id))
          .filter(Boolean);
        await addCommentMutation.mutateAsync({
          taskId: taskIdForUpdate,
          payload: {
            text: managerText.trim(),
            attachmentIds,
          },
        });
      }

      setManagerText('');
      setManagerAttachments({ images: [], videos: [], audios: [], files: [] });
      setShowSubmissionModal(false);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to add attachment.'));
    }
  }, [source, managerText, managerAttachments, addAttachmentsMutation, addCommentMutation]);

  const handleLoadMore = useCallback(() => {
    if (timelineQuery.hasNextPage && !timelineQuery.isFetchingNextPage) {
      void timelineQuery.fetchNextPage();
    }
  }, [timelineQuery]);

  const handleRefresh = useCallback(() => {
    void timelineQuery.refetch();
    void eventTypeCountsQuery.refetch();
  }, [eventTypeCountsQuery, timelineQuery]);

  const attachmentTypeToOpenType = useCallback(
    (type: AttachmentType): 'image' | 'video' | 'audio' | 'file' => {
      switch (type) {
        case AttachmentType.IMAGE:
          return 'image';
        case AttachmentType.VIDEO:
          return 'video';
        case AttachmentType.AUDIO:
          return 'audio';
        case AttachmentType.DOCUMENT:
        case AttachmentType.FILE:
          return 'file';
      }
    },
    [],
  );

  const handleAttachmentPress = useCallback(
    (attachment: AttachmentPreview) => {
      void openAttachment(attachment.url, attachmentTypeToOpenType(attachment.type));
    },
    [openAttachment, attachmentTypeToOpenType],
  );

  const handleActorPress = useCallback((_userId: string) => {
    // Future: navigate to user profile
  }, []);

  // Keep loading until both primary queries have either succeeded or failed.
  // `isLoading` can be false briefly before a fetch starts, which caused a
  // transient "Task not found" render before the shimmer.
  const detailQueryComplete = detailStatus === 'success' || detailStatus === 'error';
  const legacyQueryComplete = legacyStatus === 'success' || legacyStatus === 'error';
  const allQueriesComplete = detailQueryComplete && legacyQueryComplete;
  const isLoading = !allQueriesComplete || detailLoading || legacyLoading;
  const hasLoadError = allQueriesComplete && !source && Boolean(detailError || legacyError);
  const isTaskNotFound =
    hasLoadError && (isNotFoundApiError(detailError) || isNotFoundApiError(legacyError));

  return {
    // Data
    source,
    taskDetail,
    legacyTask,
    isLoading,
    allQueriesComplete,
    detailError,
    legacyError,
    hasLoadError,
    isTaskNotFound,
    refetchLegacy,
    isAdmin,
    timelineQuery,
    eventTypeCountsQuery,
    updateStatus,
    deleteTask,
    addAttachmentsMutation,
    addCommentMutation,
    refetchDetail,

    // Derived
    completedAtIso,
    resolvedOutletId,
    timelineEvents,
    sourceAttachments,

    // Modal state
    showEditModal,
    setShowEditModal,
    viewerImageUrl,
    setViewerImageUrl,
    showDelegationSheet,
    setShowDelegationSheet,
    showSubmissionModal,
    setShowSubmissionModal,

    // Manager submission state
    managerText,
    setManagerText,
    managerAttachments,
    setManagerAttachments,
    uploadingType,
    pickImage,
    takePhoto,
    pickVideo,
    pickFile,
    saveManagerSubmission,
    addAttachmentUrl,
    removeAttachmentUrl,
    uploadLocalFile,

    // Actions
    handleStatusChange,
    handleDelete,
    handleBack,
    openAttachment,
    handleLoadMore,
    handleRefresh,
    handleAttachmentPress,
    handleActorPress,

    // Audio (from useTaskAudioController)
    ...audioController,

    // Timeline-specific audio handler
    handleTimelineAudioPress,
  };
}
