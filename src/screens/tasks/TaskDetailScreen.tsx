import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList as RNFlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  Linking,
  TextInput,
  Modal,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as WebBrowser from 'expo-web-browser';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTask, useUpdateTaskStatus, useDeleteTask, useUpdateTask } from '../../hooks/useTasks';
import { useTaskDetail, useTaskTimeline, useEventTypeCounts } from '../../hooks/useTaskTimeline';
import { useAddAttachments, useAddComment } from '../../hooks/useTaskAttachments';
import { useMarkTaskViewed } from '../../hooks/useTaskView';
import { TaskStatus } from '../../api/endpoints/tasks';
import { AttachmentType } from '../../types/task';
import StatusBadge from '../../components/StatusBadge';
import TimelineEventCard from '../../components/TimelineEventCard';
import TimelineSkeleton from '../../components/TimelineSkeleton';
import DelegationSheet from '../../components/DelegationSheet';
import { useClearDelegation } from '../../hooks/useTaskDelegation';
import { flattenInfiniteData } from '../../utils/pagination';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';
import { uploadToCloudinary } from '../../api/endpoints/upload';
import { getApiErrorMessage } from '../../utils/errors';
import { useAuthStore } from '../../store/authStore';
import { CreateTaskContent } from './CreateTaskScreen';
import { TaskEventType } from '../../types/task';
import type { SerializedTimelineEvent, AttachmentPreview } from '../../types/task';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskDetail'>;

const ALL_STATUSES: TaskStatus[] = ['OPEN', 'COMPLETED'];
const STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: 'Open',
  COMPLETED: 'Completed',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: colors.priorityHigh,
  MEDIUM: colors.priorityMedium,
  LOW: colors.priorityLow,
};

const EVENT_TYPE_FILTERS: { label: string; type: TaskEventType | 'ALL' }[] = [
  { label: 'All', type: 'ALL' },
  { label: 'Comments', type: TaskEventType.COMMENTED },
  { label: 'Status', type: TaskEventType.STATUS_CHANGED },
  { label: 'Attachments', type: TaskEventType.ATTACHMENT_ADDED },
  { label: 'Delegations', type: TaskEventType.REASSIGNED },
];

const WAVEFORM_BARS = [6, 10, 14, 8, 16, 7, 13, 9, 15, 6, 12, 10, 14, 7, 11, 9];

const AUDIO_FILE_WAIT_RETRIES = 25;
const AUDIO_FILE_WAIT_DELAY_MS = 120;

function isReleasedAudioPlayerError(error: unknown) {
  return (
    error instanceof Error &&
    /already released|cannot be cast to type expo\.modules\.audio\.AudioPlayer/i.test(error.message)
  );
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

/**
 * Apply Cloudinary thumbnail transformation to reduce bandwidth/memory
 * for attachment thumbnails. Falls back to the original URL if it's not
 * a Cloudinary URL.
 */
function cloudinaryThumbnail(url: string, width = 200, height = 200): string {
  if (!url.includes('cloudinary')) return url;
  return url.replace('/upload/', `/upload/w_${width},h_${height},c_fill/`);
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function SubmissionBlock({
  title,
  text,
  attachments,
  onOpenAttachment,
  onRemoveAttachment,
  audioAttachmentMeta = [],
  audioPlayerStatus,
  activeAudioAttachmentId,
  audioDurationById = {},
  onAudioPress,
}: {
  title: string;
  text?: string;
  attachments?: {
    images?: string[];
    videos?: string[];
    audios?: string[];
    files?: string[];
  };
  onOpenAttachment: (url: string, type?: 'image' | 'video' | 'audio' | 'file') => void;
  onRemoveAttachment?: (type: 'images' | 'videos' | 'audios' | 'files', index: number) => void;
  audioAttachmentMeta?: { id: string; url: string }[];
  audioPlayerStatus?: any;
  activeAudioAttachmentId?: string | null;
  audioDurationById?: Record<string, number>;
  onAudioPress?: (id: string, url: string) => void;
}) {
  const imageItems = attachments?.images ?? [];
  const videoItems = attachments?.videos ?? [];
  const audioItems = attachments?.audios ?? [];
  const fileItems = attachments?.files ?? [];
  const hasAny =
    Boolean(text?.trim()) ||
    imageItems.length > 0 ||
    videoItems.length > 0 ||
    audioItems.length > 0 ||
    fileItems.length > 0;

  if (!hasAny) return null;

  return (
    <View style={styles.submissionCard}>
      <Text style={styles.submissionTitle}>{title}</Text>
      {text?.trim() ? <Text style={styles.submissionText}>{text.trim()}</Text> : null}

      {imageItems.length > 0 && (
        <View style={styles.attachmentGroup}>
          <Text style={styles.attachmentGroupTitle}>Images</Text>
          <RNFlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={imageItems}
            keyExtractor={(url, index) => `${title}-image-${url}-${index}`}
            contentContainerStyle={styles.imageRow}
            renderItem={({ item: url, index }) => (
              <TouchableOpacity
                onPress={() => onOpenAttachment(url, 'image')}
                style={styles.imageItem}
                activeOpacity={0.85}
              >
                <ExpoImage
                  source={{ uri: cloudinaryThumbnail(url) }}
                  style={styles.imageThumb}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {videoItems.map((url, index) => (
        <TouchableOpacity
          key={`${title}-video-${url}-${index}`}
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(url, 'video')}
          activeOpacity={0.8}
        >
          <View style={styles.attachmentRowLeft}>
            <Ionicons name="videocam-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.attachmentName} numberOfLines={1}>
              {buildAttachmentName(url, 'video', index)}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {audioItems.length > 0 && (
        <View style={styles.attachmentGroup}>
          {audioItems.map((url, index) => {
            const meta = audioAttachmentMeta.find((m) => m.url === url);
            const audioId = meta?.id ?? `audio-${index}-${url}`;
            const isActiveAudio = activeAudioAttachmentId === audioId;
            const knownDurationMs = audioDurationById[audioId] ?? 0;
            const liveDurationMs =
              isActiveAudio && audioPlayerStatus
                ? Math.max(Math.floor(audioPlayerStatus.duration * 1000), knownDurationMs)
                : knownDurationMs;
            const currentMillis =
              isActiveAudio && audioPlayerStatus
                ? Math.max(0, Math.floor(audioPlayerStatus.currentTime * 1000))
                : 0;
            const remainingMillis = Math.max(liveDurationMs - currentMillis, 0);
            const progress = liveDurationMs > 0 ? Math.min(currentMillis / liveDurationMs, 1) : 0;
            const activeBarCount = Math.round(progress * WAVEFORM_BARS.length);
            const durationLabel = liveDurationMs > 0 ? formatDuration(remainingMillis) : '--:--';

            return (
              <View key={`${title}-audio-${url}-${index}`} style={styles.audioAttachmentCard}>
                <View style={styles.audioPreviewRow}>
                  <View style={styles.waveformRow}>
                    {WAVEFORM_BARS.map((barHeight, barIndex) => (
                      <View
                        key={`${title}-audio-wave-${url}-${barIndex}`}
                        style={[
                          styles.waveformBar,
                          {
                            height: barHeight,
                            backgroundColor:
                              barIndex < activeBarCount ? colors.primary : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.audioDurationText}>{durationLabel}</Text>
                  <TouchableOpacity
                    style={styles.audioPlayBtn}
                    onPress={() => onAudioPress?.(audioId, url)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isActiveAudio && audioPlayerStatus?.playing ? 'pause' : 'play'}
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  {onRemoveAttachment && (
                    <TouchableOpacity
                      style={styles.removeAudioBtn}
                      onPress={() => onRemoveAttachment('audios', index)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {fileItems.map((url, index) => (
        <TouchableOpacity
          key={`${title}-file-${url}-${index}`}
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(url, 'file')}
          activeOpacity={0.8}
        >
          <View style={styles.attachmentRowLeft}>
            <Ionicons name="document-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.attachmentName} numberOfLines={1}>
              {buildAttachmentName(url, 'file', index)}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  // ─── Thread data ────────────────────────────────────────────────────────
  const {
    data: taskDetail,
    isLoading: detailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useTaskDetail(taskId);
  const timelineQuery = useTaskTimeline(taskId);
  const eventTypeCountsQuery = useEventTypeCounts(taskId);
  const addAttachmentsMutation = useAddAttachments();
  const addCommentMutation = useAddComment();
  const markTaskViewed = useMarkTaskViewed();
  const clearDelegation = useClearDelegation();

  // ─── Legacy fallback fetch ────────────────────────────────────────────────
  const { data: legacyTask } = useTask(taskId);

  // ─── Action mutations ─────────────────────────────────────────────────────
  const updateStatus = useUpdateTaskStatus();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // ─── Audio state (preserved) ──────────────────────────────────────────────
  const previewPlayer = useAudioPlayer(null, { updateInterval: 150 });
  const previewPlayerStatus = useAudioPlayerStatus(previewPlayer);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const isRecordingAudio = recorderState.isRecording;
  const recordingMillis = recorderState.durationMillis;
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecordingAudio;

  const [activeAudioAttachmentId, setActiveAudioAttachmentId] = useState<string | null>(null);
  const [pendingPlayAudioId, setPendingPlayAudioId] = useState<string | null>(null);
  const [probingAudioAttachmentId, setProbingAudioAttachmentId] = useState<string | null>(null);
  const [audioDurationById, setAudioDurationById] = useState<Record<string, number>>({});
  const [managerText, setManagerText] = useState('');
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [managerAttachments, setManagerAttachments] = useState<{
    images: string[];
    videos: string[];
    audios: string[];
    files: string[];
  }>({ images: [], videos: [], audios: [], files: [] });
  const [uploadingType, setUploadingType] = useState<
    null | 'images' | 'videos' | 'audios' | 'files'
  >(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [showDelegationSheet, setShowDelegationSheet] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // ─── Effect: mark task viewed on focus ─────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      markTaskViewed.mutate(taskId);
    }, [taskId]),
  );

  // ─── Effect: Log screen entry and data loading/errors ──────────────────
  useEffect(() => {
    console.log('[TaskDetailScreen] Navigated to TaskDetailScreen. taskId:', taskId);
  }, [taskId]);

  useEffect(() => {
    if (taskDetail) {
      console.log('[TaskDetailScreen] Fetched taskDetail successfully for taskId:', taskId, {
        summary: taskDetail.summary,
        timelinePage: taskDetail.timeline,
      });
    }
  }, [taskDetail, taskId]);

  useEffect(() => {
    if (legacyTask) {
      console.log(
        '[TaskDetailScreen] Fetched legacyTask successfully for taskId:',
        taskId,
        legacyTask,
      );
    }
  }, [legacyTask, taskId]);

  useEffect(() => {
    if (detailError) {
      const err = detailError as any;
      console.error('[TaskDetailScreen] Error fetching task detail for taskId:', taskId, {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        responseData: err.response?.data,
        url: err.config?.url,
        method: err.config?.method,
        error: err,
      });
    }
  }, [detailError, taskId]);

  useEffect(() => {
    if (timelineQuery.error) {
      const err = timelineQuery.error as any;
      console.error('[TaskDetailScreen] Error fetching timeline for taskId:', taskId, {
        message: err.message,
        status: err.response?.status,
        responseData: err.response?.data,
        url: err.config?.url,
        method: err.config?.method,
      });
    }
  }, [timelineQuery.error, taskId]);

  useEffect(() => {
    if (eventTypeCountsQuery.error) {
      const err = eventTypeCountsQuery.error as any;
      console.error('[TaskDetailScreen] Error fetching event type counts for taskId:', taskId, {
        message: err.message,
        status: err.response?.status,
        responseData: err.response?.data,
        url: err.config?.url,
        method: err.config?.method,
      });
    }
  }, [eventTypeCountsQuery.error, taskId]);

  // ─── Audio mode setup ─────────────────────────────────────────────────────
  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch((err) => console.warn('[TaskDetail] Failed to set audio mode on mount', err));
  }, []);

  // ─── Derived: task data ──────────────────────────────────────────────────
  const source = taskDetail?.summary ?? legacyTask;
  const timelineEvents = useMemo(() => {
    const rawEvents = flattenInfiniteData(timelineQuery.data);
    const clubbed: typeof rawEvents = [];
    for (const event of rawEvents) {
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

  const runPreviewPlayerActionSafely = useCallback((action: () => unknown): boolean => {
    try {
      const result = action();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((error) => {
          if (!isReleasedAudioPlayerError(error)) {
            console.warn('[TaskDetail] Audio preview action failed', error);
          }
        });
      }
      return true;
    } catch (error) {
      if (!isReleasedAudioPlayerError(error)) {
        console.warn('[TaskDetail] Audio preview action failed', error);
      }
      return false;
    }
  }, []);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('TasksList');
  };

  const handleStatusChange = () => {
    if (!source) return;

    const taskIdForUpdate = (source as any)._id ?? '';
    if (Platform.OS === 'ios') {
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
      return;
    }

    Alert.alert('Update Status', undefined, [
      ...ALL_STATUSES.map((s) => ({
        text: STATUS_LABELS[s],
        onPress: () => updateStatus.mutate({ id: taskIdForUpdate, status: s }),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDelete = () => {
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
  };

  const openAttachment = async (url: string, type?: 'image' | 'video' | 'audio' | 'file') => {
    const trimmedUrl = url.trim();
    if (type === 'image') {
      setViewerImageUrl(trimmedUrl);
      return;
    }

    if (probingAudioAttachmentId) {
      setProbingAudioAttachmentId(null);
    }

    if (activeAudioAttachmentId) {
      if (previewPlayerStatus.playing) {
        runPreviewPlayerActionSafely(() => previewPlayer.pause());
      }
      setActiveAudioAttachmentId(null);
    }
    try {
      const isHttpUrl = /^https?:\/\//i.test(trimmedUrl);
      if (type === 'file' && isHttpUrl) {
        await WebBrowser.openBrowserAsync(trimmedUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          controlsColor: colors.primary,
        });
        return;
      }
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

  // ─── Attachment helpers (preserved) ──────────────────────────────────────
  const getSourceAttachments = (source: any) => {
    const adminAttachments = source?.adminSubmission?.attachments;
    const images = Array.from(
      new Set([
        ...(source?.attachments?.images ?? source?.imageUrls ?? []),
        ...(adminAttachments?.images ?? []),
      ]),
    );
    const videos = Array.from(
      new Set([...(source?.attachments?.videos ?? []), ...(adminAttachments?.videos ?? [])]),
    );
    const savedAudios = Array.from(
      new Set([...(source?.attachments?.audios ?? []), ...(adminAttachments?.audios ?? [])]),
    );
    const audios = Array.from(new Set([...savedAudios, ...managerAttachments.audios]));
    const files = Array.from(
      new Set([...(source?.attachments?.files ?? []), ...(adminAttachments?.files ?? [])]),
    );
    const audioMeta = audios.map((url: string, index: number) => ({
      id: `audio-${index}-${url}`,
      url,
    }));
    const audioIds = audioMeta.map((item: any) => item.id);
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
  };

  const sourceAttachments = useMemo(
    () => getSourceAttachments(source),
    [source, managerAttachments.audios],
  );

  // ─── Manager submission setup ────────────────────────────────────────────
  useEffect(() => {
    if (!source) return;
    setManagerText((source as any).managerSubmission?.text ?? '');
    setManagerAttachments({
      images: (source as any).managerSubmission?.attachments?.images ?? [],
      videos: (source as any).managerSubmission?.attachments?.videos ?? [],
      audios: (source as any).managerSubmission?.attachments?.audios ?? [],
      files: (source as any).managerSubmission?.attachments?.files ?? [],
    });
  }, [source]);

  const addAttachmentUrl = (type: 'images' | 'videos' | 'audios' | 'files', url: string) => {
    setManagerAttachments((prev) => ({
      ...prev,
      [type]: [...prev[type], url],
    }));
  };

  const removeAttachmentUrl = (type: 'images' | 'videos' | 'audios' | 'files', index: number) => {
    setManagerAttachments((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, idx) => idx !== index),
    }));
  };

  const uploadLocalFile = async (type: 'images' | 'videos' | 'audios' | 'files', uri: string) => {
    setUploadingType(type);
    try {
      const remoteUrl = await uploadToCloudinary(uri, 'tasks');
      addAttachmentUrl(type, remoteUrl);
    } catch (error) {
      Alert.alert('Upload failed', getApiErrorMessage(error, 'Could not upload attachment.'));
    } finally {
      setUploadingType(null);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('images', result.assets[0].uri);
  };

  const takePhoto = async () => {
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
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('videos', result.assets[0].uri);
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('files', result.assets[0].uri);
  };

  const normalizeLocalFileUri = (uri: string): string => {
    const trimmed = uri.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) return trimmed;
    if (trimmed.startsWith('file:/')) {
      const pathOnly = trimmed.replace(/^file:\/*/, '');
      return `file://${pathOnly}`;
    }
    if (trimmed.startsWith('/')) return `file://${trimmed}`;
    return trimmed;
  };

  const waitForRecordedAudioFile = async (uri: string): Promise<number> => {
    for (let attempt = 0; attempt < AUDIO_FILE_WAIT_RETRIES; attempt += 1) {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory && info.size > 0) return info.size;
      await new Promise((resolve) => setTimeout(resolve, AUDIO_FILE_WAIT_DELAY_MS));
    }
    const finalInfo = await FileSystem.getInfoAsync(uri);
    if (finalInfo.exists && !finalInfo.isDirectory) return finalInfo.size;
    return 0;
  };

  const stageRecordedAudioForUpload = async (uri: string): Promise<string> => {
    const normalizedUri = normalizeLocalFileUri(uri);
    const recordedSize = await waitForRecordedAudioFile(normalizedUri);
    if (recordedSize <= 0) throw new Error('Recorded audio file is unavailable.');

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return normalizedUri;
    const extFromUri = normalizedUri.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
    const ext = extFromUri && /^[a-z0-9]+$/.test(extFromUri) ? extFromUri : 'm4a';
    const stagedUri = `${cacheDir}task-audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    try {
      await FileSystem.copyAsync({ from: normalizedUri, to: stagedUri });
      return stagedUri;
    } catch {
      return normalizedUri;
    }
  };

  const startAudioRecording = async () => {
    if (recordingBusy || isRecordingAudio) return;
    setRecordingBusy(true);
    runPreviewPlayerActionSafely(() => previewPlayer.pause());
    setActiveAudioAttachmentId(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Microphone access is required to record audio.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      console.warn('[TaskDetail] Start recording failed', error);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
      Alert.alert('Error', 'Could not start recording. Please try again.');
    } finally {
      setRecordingBusy(false);
    }
  };

  const stopAudioRecording = async () => {
    if (recordingBusy || !isRecordingAudio) return;
    setRecordingBusy(true);
    try {
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status.url || recorder.uri || null;
      if (uri) {
        const uploadUri = await stageRecordedAudioForUpload(uri);
        await uploadLocalFile('audios', uploadUri);
      }
    } catch (error) {
      console.warn('[TaskDetail] Stop recording failed', error);
      Alert.alert('Error', 'Could not stop recording. Please try again.');
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
      setRecordingBusy(false);
    }
  };

  const discardAudioRecording = async () => {
    if (recordingBusy || !isRecordingAudio) return;
    setRecordingBusy(true);
    try {
      await recorder.stop();
    } catch {
      // Ignore errors during discard stop
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
      setRecordingBusy(false);
    }
  };

  const saveManagerSubmission = async () => {
    if (!source) return;
    const taskId = (source as any)._id ?? (source as any).id ?? '';

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
      let uploadedAttachments: any[] = [];
      if (hasAttachments) {
        uploadedAttachments = await addAttachmentsMutation.mutateAsync({
          taskId,
          payload: { files },
        });
      }

      if (hasText) {
        const attachmentIds = uploadedAttachments.map((att) => att._id ?? att.id).filter(Boolean);
        await addCommentMutation.mutateAsync({
          taskId,
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
  };

  // ─── Audio cleanup effects (preserved) ────────────────────────────────────
  useEffect(() => {
    return () => {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
    };
  }, [previewPlayer, runPreviewPlayerActionSafely]);

  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        try {
          if (recorder.getStatus().isRecording) {
            recorder.stop().catch((err) => {
              console.warn('[TaskDetail] Cleanup: Failed to stop recorder', err);
            });
          }
        } catch (err) {
          // Catch silently if the native Shared Object has already been released
        }
      }
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch((err) => {
        console.warn('[TaskDetail] Cleanup: Failed to reset audio mode', err);
      });
    };
  }, [recorder]);

  useEffect(() => {
    const durationTargetAudioId = activeAudioAttachmentId ?? probingAudioAttachmentId;
    if (!durationTargetAudioId) return;
    const durationMillis = Math.max(0, Math.floor(previewPlayerStatus.duration * 1000));
    if (durationMillis <= 0) return;

    setAudioDurationById((prev) => {
      if (prev[durationTargetAudioId] === durationMillis) return prev;
      return { ...prev, [durationTargetAudioId]: durationMillis };
    });
    if (probingAudioAttachmentId === durationTargetAudioId) {
      setProbingAudioAttachmentId(null);
    }
  }, [activeAudioAttachmentId, probingAudioAttachmentId, previewPlayerStatus.duration]);

  useEffect(() => {
    if (activeAudioAttachmentId || previewPlayerStatus.playing || probingAudioAttachmentId) return;
    const nextToProbe = sourceAttachments.audioMeta.find(
      (item: any) => !audioDurationById[item.id],
    );
    if (!nextToProbe) return;

    const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(nextToProbe.url));
    if (!replaced) return;
    setProbingAudioAttachmentId(nextToProbe.id);
  }, [
    activeAudioAttachmentId,
    previewPlayerStatus.playing,
    probingAudioAttachmentId,
    sourceAttachments.audioIdsKey,
    audioDurationById,
    previewPlayer,
    runPreviewPlayerActionSafely,
  ]);

  useEffect(() => {
    if (!activeAudioAttachmentId) return;
    if (!sourceAttachments.audioMeta.some((m: any) => m.id === activeAudioAttachmentId)) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      setActiveAudioAttachmentId(null);
      setPendingPlayAudioId(null);
    }
  }, [
    activeAudioAttachmentId,
    sourceAttachments.audioIdsKey,
    previewPlayer,
    runPreviewPlayerActionSafely,
  ]);

  useEffect(() => {
    if (!probingAudioAttachmentId) return;
    if (!sourceAttachments.audioMeta.some((m: any) => m.id === probingAudioAttachmentId)) {
      setProbingAudioAttachmentId(null);
    }
  }, [probingAudioAttachmentId, sourceAttachments.audioIdsKey]);

  useEffect(() => {
    if (!pendingPlayAudioId || !previewPlayerStatus.isLoaded) return;
    runPreviewPlayerActionSafely(() => previewPlayer.play());
    setPendingPlayAudioId(null);
  }, [
    pendingPlayAudioId,
    previewPlayerStatus.isLoaded,
    previewPlayer,
    runPreviewPlayerActionSafely,
  ]);

  const handleAudioAttachmentPress = (audioId: string, url: string) => {
    if (probingAudioAttachmentId) setProbingAudioAttachmentId(null);

    if (activeAudioAttachmentId !== audioId) {
      const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(url));
      if (!replaced) return;
      setPendingPlayAudioId(audioId);
      setActiveAudioAttachmentId(audioId);
      return;
    }

    if (previewPlayerStatus.playing) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      return;
    }

    const shouldRestart =
      previewPlayerStatus.didJustFinish ||
      (previewPlayerStatus.duration > 0 &&
        previewPlayerStatus.currentTime >= previewPlayerStatus.duration);
    if (shouldRestart) {
      void previewPlayer.seekTo(0).catch(() => undefined);
    }
    runPreviewPlayerActionSafely(() => previewPlayer.play());
  };

  // ─── Event filter handling ───────────────────────────────────────────────
  const filteredEvents = timelineEvents;

  const handleLoadMore = useCallback(() => {
    if (timelineQuery.hasNextPage && !timelineQuery.isFetchingNextPage) {
      void timelineQuery.fetchNextPage();
    }
  }, [timelineQuery.hasNextPage, timelineQuery.isFetchingNextPage, timelineQuery.fetchNextPage]);

  const handleRefresh = useCallback(() => {
    void timelineQuery.refetch();
    void eventTypeCountsQuery.refetch();
  }, [timelineQuery.refetch, eventTypeCountsQuery.refetch]);

  const handleAttachmentPress = useCallback((attachment: AttachmentPreview) => {
    openAttachment(attachment.url, 'image');
  }, []);

  const handleActorPress = useCallback((_userId: string) => {
    // Future: navigate to user profile
  }, []);

  const isLoading = detailLoading;

  // ─── Render: List Header (summary + manager submission) ──────────────────
  const renderListHeader = useCallback(() => {
    if (!source) return null;

    const isOverdue = source.status !== 'COMPLETED' && new Date(source.dueDate) < new Date();
    const outletName = getTaskOutletName(source, legacyTask);
    const categoryName = getTaskCategoryName(source, legacyTask);
    const assigneeNames = getTaskAssigneeNames(source, legacyTask, [
      ...(taskDetail?.timeline?.data ?? []),
      ...filteredEvents,
    ]);
    const isNotCompleted = source.status !== 'COMPLETED' && !isAdmin;

    return (
      <View>
        {/* ── Summary Card ──────────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <View style={styles.ownerTopRow}>
            <View style={styles.ownerHeadingWrap}>
              <View style={styles.ownerTitleRow}>
                <Text style={styles.ownerTitle}>{categoryName || 'Task'}</Text>
                {isOverdue ? <Text style={styles.overdueTopTag}>Overdue</Text> : null}
              </View>
              {outletName ? <Text style={styles.ownerOutlet}>{outletName}</Text> : null}
            </View>
            <View style={styles.ownerBadgeWrap}>
              <View style={styles.ownerStatusPriorityRow}>
                <StatusBadge status={source.status} />
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor:
                        (PRIORITY_COLORS[source.priority] ?? colors.textSecondary) + '22',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: PRIORITY_COLORS[source.priority] ?? colors.textSecondary },
                    ]}
                  >
                    {source.priority}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Row label="Due Date" value={formatDate(source.dueDate, source.dueTime)} />
          <Row label="Created" value={formatDate(source.createdAt)} />
          {(source as any).completedAt && (
            <Row label="Completed" value={formatDate((source as any).completedAt)} />
          )}

          {assigneeNames.length > 0 && (
            <>
              <Text style={styles.ownerDescriptionLabel}>Assigned Managers</Text>
              <Text style={styles.description}>{assigneeNames.join(', ')}</Text>
            </>
          )}

          <Text style={styles.ownerDescriptionLabel}>Description</Text>
          <Text style={styles.description}>{source.description}</Text>

          {/* Attachments gallery (only for completed tasks) */}
          {source.status === 'COMPLETED' && sourceAttachments.hasAny && (
            <View style={styles.attachmentsInlineWrap}>
              <Text style={styles.ownerDescriptionLabel}>Attachments</Text>
              {sourceAttachments.images.length > 0 && (
                <View style={styles.attachmentGroup}>
                  <Text style={styles.attachmentGroupTitle}>Images</Text>
                  <RNFlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={sourceAttachments.images}
                    keyExtractor={(url: string, index: number) => `image-${url}-${index}`}
                    contentContainerStyle={styles.imageRow}
                    renderItem={({ item: url, index }) => (
                      <TouchableOpacity
                        onPress={() => {
                          void openAttachment(url, 'image');
                        }}
                        style={styles.imageItem}
                        activeOpacity={0.85}
                      >
                        <ExpoImage
                          source={{ uri: cloudinaryThumbnail(url) }}
                          style={styles.imageThumb}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {sourceAttachments.videos.length > 0 && (
                <View style={styles.attachmentGroup}>
                  <Text style={styles.attachmentGroupTitle}>Videos</Text>
                  {sourceAttachments.videos.map((url: string, index: number) => (
                    <TouchableOpacity
                      key={`video-${url}-${index}`}
                      style={styles.attachmentRow}
                      onPress={() => {
                        void openAttachment(url, 'video');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.attachmentRowLeft}>
                        <Ionicons name="videocam-outline" size={16} color={colors.primaryDark} />
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {buildAttachmentName(url, 'video', index)}
                        </Text>
                      </View>
                      <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {sourceAttachments.savedAudios.length > 0 && (
                <SubmissionBlock
                  title="Audio"
                  onOpenAttachment={openAttachment}
                  attachments={{ audios: sourceAttachments.savedAudios }}
                  audioAttachmentMeta={sourceAttachments.audioMeta}
                  audioPlayerStatus={previewPlayerStatus}
                  activeAudioAttachmentId={activeAudioAttachmentId}
                  audioDurationById={audioDurationById}
                  onAudioPress={handleAudioAttachmentPress}
                />
              )}

              {sourceAttachments.files.length > 0 && (
                <View style={styles.attachmentGroup}>
                  <Text style={styles.attachmentGroupTitle}>Files</Text>
                  {sourceAttachments.files.map((url: string, index: number) => (
                    <TouchableOpacity
                      key={`file-${url}-${index}`}
                      style={styles.attachmentRow}
                      onPress={() => {
                        void openAttachment(url, 'file');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.attachmentRowLeft}>
                        <Ionicons name="document-outline" size={16} color={colors.primaryDark} />
                        <Text style={styles.attachmentName} numberOfLines={1}>
                          {buildAttachmentName(url, 'file', index)}
                        </Text>
                      </View>
                      <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Activity Section Header ────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingWrap}>
            <View style={[styles.sectionDot, styles.sectionDotActivity]} />
            <Text style={styles.sectionTitle}>Activity</Text>
          </View>
          <Text style={styles.sectionCount}>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* ── Manager Submission Section (Moved to Modal) ────────────────────── */}
        {isNotCompleted ? null : managerText.trim().length > 0 ||
          managerAttachments.images.length > 0 ||
          managerAttachments.videos.length > 0 ||
          managerAttachments.audios.length > 0 ||
          managerAttachments.files.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingWrap}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Manager Submission</Text>
              </View>
            </View>
            <SubmissionBlock
              title="Submitted Details"
              text={managerText}
              attachments={managerAttachments}
              onOpenAttachment={(url, type) => {
                void openAttachment(url, type);
              }}
              audioAttachmentMeta={sourceAttachments.audioMeta}
              audioPlayerStatus={previewPlayerStatus}
              activeAudioAttachmentId={activeAudioAttachmentId}
              audioDurationById={audioDurationById}
              onAudioPress={handleAudioAttachmentPress}
            />
          </>
        ) : null}
      </View>
    );
  }, [
    source,
    legacyTask,
    taskDetail,
    filteredEvents,
    sourceAttachments,
    managerText,
    managerAttachments,
    isRecordingAudio,
    recordingMillis,
    recordingBusy,
    uploadingType,
    updateTask.isPending,
    previewPlayerStatus,
    activeAudioAttachmentId,
    audioDurationById,
  ]);

  // ─── Render: Timeline Event ──────────────────────────────────────────────
  const renderEvent = useCallback(
    ({ item }: { item: SerializedTimelineEvent }) => (
      <TimelineEventCard
        event={item}
        isLast={item.sortKey === filteredEvents[filteredEvents.length - 1]?.sortKey}
        onAttachmentPress={handleAttachmentPress}
        onActorPress={handleActorPress}
      />
    ),
    [filteredEvents, handleAttachmentPress, handleActorPress],
  );

  const keyExtractor = useCallback((item: SerializedTimelineEvent) => item._id, []);

  // ─── Loading & Error states ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.root}>
        <TimelineSkeleton />
      </View>
    );
  }

  if ((detailError && !legacyTask) || (!source && !timelineQuery.isLoading)) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textDisabled} />
        <Text style={styles.notFoundText}>
          {detailError ? 'Failed to load task' : 'Task not found'}
        </Text>
        <Text style={styles.emptyTimelineSubtext}>
          {detailError
            ? 'Check your connection and try again'
            : 'This task may have been deleted or you may not have access'}
        </Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            void timelineQuery.refetch();
            void eventTypeCountsQuery.refetch();
            void refetchDetail();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="refresh"
            size={16}
            color={colors.textInverse}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fallback: if source is still undefined (e.g. timeline loading but detail not ready)
  if (!source) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* ── Header (fixed) ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headingWrap}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.heading} numberOfLines={1}>
              Task Details
            </Text>
          </View>
        </View>
      </View>

      {/* Sticky Task Details Card & Activity Header */}
      {renderListHeader()}

      {/* ── Timeline FlashList (virtualized) ───────────────────────────── */}
      <FlashList
        style={styles.timelineList}
        contentContainerStyle={styles.timelineContent}
        data={filteredEvents}
        keyExtractor={keyExtractor}
        renderItem={renderEvent}
        ListFooterComponent={
          timelineQuery.isFetchingNextPage ? (
            <View style={styles.loadingMoreWrap}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.loadingMoreText}>Loading more events...</Text>
            </View>
          ) : !timelineQuery.hasNextPage && filteredEvents.length > 0 ? (
            <View style={styles.endOfTimeline}>
              <View style={styles.endDot} />
              <Text style={styles.endText}>You've seen everything</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !timelineQuery.isLoading ? (
            <View style={styles.emptyTimeline}>
              <Ionicons name="time-outline" size={32} color={colors.textDisabled} />
              <Text style={styles.emptyTimelineText}>
                {timelineQuery.isError ? 'Failed to load activity' : 'No activity yet'}
              </Text>
              <Text style={styles.emptyTimelineSubtext}>
                {timelineQuery.isError
                  ? 'Pull down to try again'
                  : 'Events will appear here as the task is updated'}
              </Text>
              {timelineQuery.isError && (
                <TouchableOpacity
                  style={styles.retryBtnSmall}
                  onPress={() => timelineQuery.refetch()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={styles.retryBtnSmallText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : timelineQuery.isLoading && !isLoading ? (
            <TimelineSkeleton />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={timelineQuery.isRefetching && !timelineQuery.isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator
        persistentScrollbar
      />

      {/* ── Bottom Action Bar ─────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          {/* Complete/Reopen Button */}
          <TouchableOpacity
            style={styles.bottomBarBtn}
            onPress={handleStatusChange}
            activeOpacity={0.82}
            accessibilityLabel={source.status === 'COMPLETED' ? 'Reopen task' : 'Complete task'}
            aria-label={source.status === 'COMPLETED' ? 'Reopen task' : 'Complete task'}
          >
            <Ionicons
              name={source.status === 'COMPLETED' ? 'refresh' : 'checkmark-circle-outline'}
              size={20}
              color={colors.textInverse}
            />
          </TouchableOpacity>

          {/* Edit Button */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.bottomBarBtn}
              onPress={() => setShowEditModal(true)}
              activeOpacity={0.82}
              accessibilityLabel="Edit task"
              aria-label="Edit task"
            >
              <Ionicons name="create-outline" size={20} color={colors.textInverse} />
            </TouchableOpacity>
          )}

          {/* Centered Add Attachment (+) Button */}
          <TouchableOpacity
            style={[
              styles.bottomBarBtn,
              source.status === 'COMPLETED' && styles.bottomBarBtnDisabled,
            ]}
            onPress={() => setShowSubmissionModal(true)}
            disabled={source.status === 'COMPLETED'}
            activeOpacity={0.82}
            accessibilityLabel="Add attachment"
            aria-label="Add attachment"
          >
            <Ionicons name="add" size={24} color={colors.textInverse} />
          </TouchableOpacity>

          {/* Delete Button */}
          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.bottomBarBtn,
                styles.bottomBarBtnDelete,
                deleteTask.isPending && styles.bottomBarBtnDisabled,
              ]}
              onPress={handleDelete}
              disabled={deleteTask.isPending}
              activeOpacity={0.82}
              accessibilityLabel="Delete task"
              aria-label="Delete task"
            >
              {deleteTask.isPending ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          )}

          {/* Delegate Button */}
          <TouchableOpacity
            style={[styles.bottomBarBtn, styles.bottomBarBtnSecondary]}
            activeOpacity={0.82}
            onPress={() => setShowDelegationSheet(true)}
            accessibilityLabel="Delegate task"
            aria-label="Delegate task"
          >
            <Ionicons name="person-add-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.editModalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.editModalScrim}
            onPress={() => setShowEditModal(false)}
          />
          <View style={styles.editSheet}>
            <View style={styles.editSheetTop}>
              <View style={styles.editSheetHandle} />
              <View style={styles.editSheetHeader}>
                <Text style={styles.editSheetTitle}>Edit Task</Text>
                <TouchableOpacity
                  style={styles.editSheetClose}
                  onPress={() => setShowEditModal(false)}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
            <CreateTaskContent
              onSuccess={() => setShowEditModal(false)}
              editTask={source as any}
              submitLabel="Save Changes"
              bottomPadding={24}
              fill
              backgroundColor={colors.surface}
            />
          </View>
        </View>
      </Modal>

      {/* ── Image Viewer Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={!!viewerImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImageUrl(null)}
      >
        <View style={styles.viewerRoot}>
          <TouchableOpacity
            style={styles.viewerCloseBtn}
            onPress={() => setViewerImageUrl(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {viewerImageUrl ? (
            <ExpoImage
              source={{ uri: viewerImageUrl }}
              style={styles.viewerImage}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : null}
        </View>
      </Modal>
      {/* ── Add Attachment Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showSubmissionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubmissionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.submissionModalRoot}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.submissionModalScrim}
            onPress={() => setShowSubmissionModal(false)}
          />
          <View style={styles.submissionSheet}>
            <View style={styles.editSheetTop}>
              <View style={styles.editSheetHandle} />
              <View style={styles.editSheetHeader}>
                <Text style={styles.editSheetTitle}>Add Attachment</Text>
                <TouchableOpacity
                  style={styles.editSheetClose}
                  onPress={() => setShowSubmissionModal(false)}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.submissionModalScroll}
              contentContainerStyle={styles.submissionModalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.managerTextInput}
                placeholder="Add notes..."
                placeholderTextColor={colors.textSecondary}
                value={managerText}
                onChangeText={setManagerText}
                multiline
                textAlignVertical="top"
              />

              {isRecordingAudio ? (
                <View style={styles.recordingRow}>
                  <View style={styles.recordingTimerWrap}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingTimerText}>{formatDuration(recordingMillis)}</Text>
                  </View>
                  <View style={styles.recordingActions}>
                    <TouchableOpacity
                      style={styles.recordingActionBtn}
                      onPress={() => {
                        void discardAudioRecording();
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.recordingActionBtn, styles.stopRecordingBtn]}
                      onPress={() => {
                        void stopAudioRecording();
                      }}
                    >
                      <Ionicons name="stop" size={18} color={colors.textInverse} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.managerActionsRow}>
                  <TouchableOpacity
                    style={styles.managerActionBtn}
                    onPress={() => {
                      void takePhoto();
                    }}
                    disabled={uploadingType !== null || recordingBusy}
                  >
                    <Ionicons name="camera-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.managerActionBtn}
                    onPress={() => {
                      void pickImage();
                    }}
                    disabled={uploadingType !== null || recordingBusy}
                  >
                    <Ionicons name="image-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.managerActionBtn}
                    onPress={() => {
                      void pickVideo();
                    }}
                    disabled={uploadingType !== null || recordingBusy}
                  >
                    <Ionicons name="videocam-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>Video</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.managerActionBtn}
                    onPress={() => {
                      void pickFile();
                    }}
                    disabled={uploadingType !== null || recordingBusy}
                  >
                    <Ionicons name="document-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>File</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.managerActionBtn}
                    onPress={() => {
                      void startAudioRecording();
                    }}
                    disabled={uploadingType !== null || recordingBusy}
                  >
                    <Ionicons name="mic-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>Voice</Text>
                  </TouchableOpacity>
                </View>
              )}

              {uploadingType && (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.uploadingText}>
                    Uploading {uploadingType.slice(0, -1)}...
                  </Text>
                </View>
              )}

              {(managerAttachments.images.length > 0 ||
                managerAttachments.videos.length > 0 ||
                managerAttachments.audios.length > 0 ||
                managerAttachments.files.length > 0) && (
                <SubmissionBlock
                  title="Attached"
                  text={undefined}
                  attachments={managerAttachments}
                  onOpenAttachment={(url, type) => {
                    void openAttachment(url, type);
                  }}
                  onRemoveAttachment={removeAttachmentUrl}
                  audioAttachmentMeta={sourceAttachments.audioMeta}
                  audioPlayerStatus={previewPlayerStatus}
                  activeAudioAttachmentId={activeAudioAttachmentId}
                  audioDurationById={audioDurationById}
                  onAudioPress={handleAudioAttachmentPress}
                />
              )}

              <View style={styles.managerTagGroup}>
                {managerAttachments.images.map((url: string, index: number) => (
                  <TouchableOpacity
                    key={`manager-image-${url}-${index}`}
                    style={styles.attachmentTag}
                    onLongPress={() => removeAttachmentUrl('images', index)}
                  >
                    <Text style={styles.attachmentTagText} numberOfLines={1}>
                      {buildAttachmentName(url, 'image', index)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {managerAttachments.videos.map((url: string, index: number) => (
                  <TouchableOpacity
                    key={`manager-video-${url}-${index}`}
                    style={styles.attachmentTag}
                    onLongPress={() => removeAttachmentUrl('videos', index)}
                  >
                    <Text style={styles.attachmentTagText} numberOfLines={1}>
                      {buildAttachmentName(url, 'video', index)}
                    </Text>
                  </TouchableOpacity>
                ))}
                {managerAttachments.files.map((url: string, index: number) => (
                  <TouchableOpacity
                    key={`manager-file-${url}-${index}`}
                    style={styles.attachmentTag}
                    onLongPress={() => removeAttachmentUrl('files', index)}
                  >
                    <Text style={styles.attachmentTagText} numberOfLines={1}>
                      {buildAttachmentName(url, 'file', index)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.saveManagerBtn,
                  (addAttachmentsMutation.isPending || addCommentMutation.isPending) &&
                    styles.iconActionBtnDisabled,
                ]}
                onPress={saveManagerSubmission}
                disabled={addAttachmentsMutation.isPending || addCommentMutation.isPending}
              >
                {addAttachmentsMutation.isPending || addCommentMutation.isPending ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.saveManagerBtnText}>Add Attachment</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Delegation Sheet ─────────────────────────────────────────── */}
      <DelegationSheet
        visible={showDelegationSheet}
        onClose={() => setShowDelegationSheet(false)}
        taskId={taskId}
        taskDescription={source?.description}
        excludeUserIds={[
          ...(source?.assigneeIds ?? []),
          ...(user?.id ? [user.id] : []),
          ...(user?._id ? [user._id] : []),
        ]}
        outletId={source?.outletId || (source as any).outlet?._id}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.screenBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headingWrap: { flex: 1 },
  heading: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: -spacing.xs,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconActionBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.buttonPrimaryBg,
    ...shadow.sm,
  },
  deleteActionBtn: { backgroundColor: colors.error },
  editActionBtn: { backgroundColor: colors.primary },
  iconActionBtnDisabled: { opacity: 0.6 },

  // ── Timeline List ────────────────────────────────────────────────────────
  timelineList: { flex: 1 },
  timelineContent: { paddingBottom: spacing.md },

  // ── Summary Card ─────────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#D3C5AC40',
    ...shadow.sm,
  },
  ownerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ownerHeadingWrap: { flex: 1, gap: 2 },
  ownerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ownerTitle: { fontSize: typography.md, color: colors.text, fontWeight: typography.bold },
  ownerOutlet: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  ownerBadgeWrap: { alignItems: 'flex-end' },
  ownerStatusPriorityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  priorityText: { fontSize: typography.xs, fontWeight: typography.semibold },
  description: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },
  ownerDescriptionLabel: {
    marginTop: spacing.sm,
    marginBottom: 4,
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  overdueTopTag: { color: colors.error, fontSize: typography.xs, fontWeight: typography.semibold },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: typography.sm, color: colors.textSecondary },
  rowValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },

  // ── Thread Stats ─────────────────────────────────────────────────────────
  threadStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statText: { fontSize: typography.xs, color: colors.textSecondary, fontWeight: typography.medium },
  statTimestamp: {
    fontSize: typography.xs,
    color: colors.textDisabled,
    flex: 1,
    textAlign: 'right',
  },

  // ── Attachments ──────────────────────────────────────────────────────────
  attachmentsInlineWrap: { marginTop: spacing.sm },
  attachmentGroup: { marginBottom: spacing.sm },
  attachmentGroupTitle: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  imageRow: { gap: spacing.sm, paddingTop: 2 },
  imageItem: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageThumb: { width: 108, height: 108, backgroundColor: colors.surfaceElevated },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  attachmentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  attachmentName: { fontSize: typography.sm, color: colors.textSecondary, flex: 1 },

  // ── Audio ─────────────────────────────────────────────────────────────────
  audioAttachmentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  audioPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  audioPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTintStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waveformRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 20 },
  waveformBar: { width: 3, borderRadius: radius.full },
  audioDurationText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    minWidth: 76,
    textAlign: 'right',
  },
  removeAudioBtn: { padding: 4 },
  submissionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  submissionTitle: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  submissionText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },

  // ── Filter Chips ─────────────────────────────────────────────────────────
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  filterChipTextActive: { color: colors.textInverse, fontWeight: typography.semibold },

  // ── Section Header ───────────────────────────────────────────────────────
  sectionHeader: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: '#EAB308' },
  sectionDotActivity: { backgroundColor: colors.info },
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

  // ── Timeline States ──────────────────────────────────────────────────────
  loadingMoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  loadingMoreText: { fontSize: typography.xs, color: colors.textSecondary },
  endOfTimeline: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  endDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textDisabled },
  endText: { fontSize: typography.xs, color: colors.textDisabled },
  emptyTimeline: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  emptyTimelineText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  emptyTimelineSubtext: {
    fontSize: typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
  },

  // ── Manager Submission ───────────────────────────────────────────────────
  managerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
    gap: spacing.sm,
  },
  managerTextInput: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  managerActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  managerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  managerActionBtnText: {
    fontSize: typography.xs,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  uploadingText: { fontSize: typography.xs, color: colors.textSecondary },
  managerTagGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  attachmentTag: {
    maxWidth: '100%',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  attachmentTagText: { fontSize: typography.xs, color: colors.textSecondary },
  saveManagerBtn: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  saveManagerBtnText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: typography.semibold,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  recordingTimerWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recordingDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.error },
  recordingTimerText: {
    fontSize: typography.md,
    color: colors.error,
    fontWeight: typography.bold,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recordingActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recordingActionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopRecordingBtn: { backgroundColor: colors.error, borderColor: colors.error },

  // ── Bottom Action Bar ────────────────────────────────────────────────────
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: Platform.OS === 'ios' ? 104 : 96,
    ...shadow.md,
  },
  bottomBarInner: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bottomBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  bottomBarBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomBarBtnDelete: {
    backgroundColor: colors.error,
  },
  bottomBarBtnDisabled: {
    opacity: 0.6,
  },
  bottomBarBtnText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: typography.semibold,
  },
  bottomBarBtnTextSecondary: {
    color: colors.primary,
  },

  // ── Edit Modal ───────────────────────────────────────────────────────────
  editModalRoot: { flex: 1, justifyContent: 'flex-end' },
  editModalScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  editSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    overflow: 'hidden',
  },
  editSheetTop: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },
  editSheetHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editSheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  editSheetClose: { padding: 4 },

  // ── Image Viewer Modal ───────────────────────────────────────────────────
  viewerRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  viewerImage: { width: '100%', height: '100%' },

  // ── Error / Retry States ──────────────────────────────────────────────────
  notFoundText: {
    marginTop: spacing.sm,
    fontSize: typography.base,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  retryBtnText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: typography.semibold,
  },
  retryBtnSmall: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  retryBtnSmallText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: typography.semibold,
  },

  // ── Dedicated Attachments Section ────────────────────────────────────────
  attachmentsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#D3C5AC40',
    ...shadow.sm,
  },
  attachmentsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attachmentsTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#4F4633',
    fontWeight: typography.bold,
  },
  addFilesBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  addFilesText: {
    fontSize: typography.sm,
    color: colors.primaryDark,
    fontWeight: typography.bold,
  },
  attachmentsScroll: {
    marginTop: spacing.xs,
  },
  attachmentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: '#F9FAFB',
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  attachmentIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  attachmentIconThumb: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
  },
  attachmentTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  attachmentItemName: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
  },
  attachmentItemMeta: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  attachmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  attachmentActionBtn: {
    padding: 4,
  },
  emptyAttachmentsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyAttachmentsText: {
    fontSize: typography.sm,
    color: colors.textDisabled,
    marginTop: spacing.xs,
  },
  submissionModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  submissionModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  submissionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  submissionModalScroll: {
    flexGrow: 0,
  },
  submissionModalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: spacing.md,
  },
});
