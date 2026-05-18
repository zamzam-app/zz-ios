import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  Image,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTask, useUpdateTaskStatus, useDeleteTask, useUpdateTask } from '../../hooks/useTasks';
import { TaskStatus, Task } from '../../api/endpoints/tasks';
import StatusBadge from '../../components/StatusBadge';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';
import { uploadToCloudinary } from '../../api/endpoints/upload';
import { getApiErrorMessage } from '../../utils/errors';
import { useAuthStore } from '../../store/authStore';
import { CreateTaskContent } from './CreateTaskScreen';

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
const WAVEFORM_BARS = [6, 10, 14, 8, 16, 7, 13, 9, 15, 6, 12, 10, 14, 7, 11, 9];

const AUDIO_FILE_WAIT_RETRIES = 25;
const AUDIO_FILE_WAIT_DELAY_MS = 120;

function isReleasedAudioPlayerError(error: unknown) {
  return (
    error instanceof Error
    && /already released|cannot be cast to type expo\.modules\.audio\.AudioPlayer/i.test(error.message)
  );
}

function formatDate(iso?: string | null, dueTime?: string | null) {
  if (!iso) return 'Not set';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not set';
  const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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
  const hasAny = Boolean(text?.trim())
    || imageItems.length > 0
    || videoItems.length > 0
    || audioItems.length > 0
    || fileItems.length > 0;

  if (!hasAny) return null;

  return (
    <View style={styles.submissionCard}>
      <Text style={styles.submissionTitle}>{title}</Text>
      {text?.trim() ? (
        <Text style={styles.submissionText}>{text.trim()}</Text>
      ) : null}

      {imageItems.length > 0 && (
        <View style={styles.attachmentGroup}>
          <Text style={styles.attachmentGroupTitle}>Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
            {imageItems.map((url, index) => (
              <TouchableOpacity
                key={`${title}-image-${url}-${index}`}
                onPress={() => onOpenAttachment(url, 'image')}
                style={styles.imageItem}
                activeOpacity={0.85}
              >
                <Image source={{ uri: url }} style={styles.imageThumb} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
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
            <Text style={styles.attachmentName} numberOfLines={1}>{buildAttachmentName(url, 'video', index)}</Text>
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
            const liveDurationMs = isActiveAudio && audioPlayerStatus
              ? Math.max(Math.floor(audioPlayerStatus.duration * 1000), knownDurationMs)
              : knownDurationMs;
            const currentMillis = isActiveAudio && audioPlayerStatus
              ? Math.max(0, Math.floor(audioPlayerStatus.currentTime * 1000))
              : 0;
            const remainingMillis = Math.max(liveDurationMs - currentMillis, 0);
            const progress = liveDurationMs > 0 ? Math.min(currentMillis / liveDurationMs, 1) : 0;
            const activeBarCount = Math.round(progress * WAVEFORM_BARS.length);
            const durationLabel = liveDurationMs > 0 ? formatDuration(remainingMillis) : '--:--';

            return (
              <View
                key={`${title}-audio-${url}-${index}`}
                style={styles.audioAttachmentCard}
              >
                <View style={styles.audioPreviewRow}>
                  <View style={styles.waveformRow}>
                    {WAVEFORM_BARS.map((barHeight, barIndex) => (
                      <View
                        key={`${title}-audio-wave-${url}-${barIndex}`}
                        style={[
                          styles.waveformBar,
                          {
                            height: barHeight,
                            backgroundColor: barIndex < activeBarCount ? colors.primary : colors.border,
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
            <Text style={styles.attachmentName} numberOfLines={1}>{buildAttachmentName(url, 'file', index)}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const { data: task, isLoading } = useTask(taskId);
  const updateStatus = useUpdateTaskStatus();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
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
  const [uploadingType, setUploadingType] = useState<null | 'images' | 'videos' | 'audios' | 'files'>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch((err) => console.warn('[TaskDetail] Failed to set audio mode on mount', err));
  }, []);

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
      return;
    }

    Alert.alert('Update Status', undefined, [
      ...ALL_STATUSES.map((s) => ({
        text: STATUS_LABELS[s],
        onPress: () => updateStatus.mutate({ id: task.id, status: s }),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
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
        const browserResult = await WebBrowser.openBrowserAsync(trimmedUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          controlsColor: colors.primary,
        });

        if (browserResult.type !== 'cancel' && browserResult.type !== 'dismiss') {
          return;
        }
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

  const adminAttachments = task?.adminSubmission?.attachments;
  const imageAttachments = Array.from(new Set([
    ...(task?.attachments?.images ?? task?.imageUrls ?? []),
    ...(adminAttachments?.images ?? [])
  ]));
  const videoAttachments = Array.from(new Set([
    ...(task?.attachments?.videos ?? []),
    ...(adminAttachments?.videos ?? [])
  ]));
  const savedAudioAttachments = Array.from(new Set([
    ...(task?.attachments?.audios ?? []),
    ...(adminAttachments?.audios ?? [])
  ]));
  const audioAttachments = Array.from(new Set([
    ...savedAudioAttachments,
    ...(managerAttachments.audios)
  ]));
  const fileAttachments = Array.from(new Set([
    ...(task?.attachments?.files ?? []),
    ...(adminAttachments?.files ?? [])
  ]));
  const audioAttachmentMeta = audioAttachments.map((url, index) => ({ id: `audio-${index}-${url}`, url }));
  const audioAttachmentIds = audioAttachmentMeta.map((item) => item.id);
  const audioAttachmentIdsKey = audioAttachmentIds.join('|');
  const attachmentCount = imageAttachments.length
    + videoAttachments.length
    + savedAudioAttachments.length
    + fileAttachments.length;
  const hasAttachments = attachmentCount > 0;

  useEffect(() => {
    if (!task) return;
    setManagerText(task.managerSubmission?.text ?? '');
    setManagerAttachments({
      images: task.managerSubmission?.attachments?.images ?? [],
      videos: task.managerSubmission?.attachments?.videos ?? [],
      audios: task.managerSubmission?.attachments?.audios ?? [],
      files: task.managerSubmission?.attachments?.files ?? [],
    });
  }, [task?.id, task?.managerSubmission?.text, task?.managerSubmission?.attachments]);

  const addAttachmentUrl = (
    type: 'images' | 'videos' | 'audios' | 'files',
    url: string,
  ) => {
    setManagerAttachments((prev) => ({
      ...prev,
      [type]: [...prev[type], url],
    }));
  };

  const removeAttachmentUrl = (
    type: 'images' | 'videos' | 'audios' | 'files',
    index: number,
  ) => {
    setManagerAttachments((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, idx) => idx !== index),
    }));
  };

  const uploadLocalFile = async (
    type: 'images' | 'videos' | 'audios' | 'files',
    uri: string,
  ) => {
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
    if (trimmed.startsWith('file://') || trimmed.startsWith('content://')) {
      return trimmed;
    }
    if (trimmed.startsWith('file:/')) {
      const pathOnly = trimmed.replace(/^file:\/*/, '/');
      return `file://${pathOnly}`;
    }
    if (trimmed.startsWith('/')) {
      return `file://${trimmed}`;
    }
    return trimmed;
  };

  const waitForRecordedAudioFile = async (uri: string): Promise<number> => {
    for (let attempt = 0; attempt < AUDIO_FILE_WAIT_RETRIES; attempt += 1) {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory && info.size > 0) {
        return info.size;
      }
      await new Promise((resolve) => setTimeout(resolve, AUDIO_FILE_WAIT_DELAY_MS));
    }

    const finalInfo = await FileSystem.getInfoAsync(uri);
    if (finalInfo.exists && !finalInfo.isDirectory) {
      return finalInfo.size;
    }
    return 0;
  };

  const stageRecordedAudioForUpload = async (uri: string): Promise<string> => {
    const normalizedUri = normalizeLocalFileUri(uri);
    const recordedSize = await waitForRecordedAudioFile(normalizedUri);
    if (recordedSize <= 0) {
      throw new Error('Recorded audio file is unavailable.');
    }

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return normalizedUri;

    const extFromUri = normalizedUri
      .split(/[?#]/)[0]
      .split('.')
      .pop()
      ?.toLowerCase();
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

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      console.warn('[TaskDetail] Start recording failed', error);
      // Reset audio mode if it fails after setAudioModeAsync
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => undefined);

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
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => undefined);
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
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch(() => undefined);
      setRecordingBusy(false);
    }
  };

  const saveManagerSubmission = () => {
    if (!task) return;

    Alert.alert(
      'Complete Task',
      'Are you sure you want to save this submission and mark the task as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Task',
          style: 'default',
          onPress: () => {
            updateTask.mutate(
              {
                id: task.id,
                payload: {
                  status: 'COMPLETED',
                  managerSubmission: {
                    text: managerText,
                    attachments: {
                      images: managerAttachments.images,
                      videos: managerAttachments.videos,
                      audios: managerAttachments.audios,
                      files: managerAttachments.files,
                    },
                  },
                },
              },
              {
                onError: (error) => {
                  Alert.alert('Could not save', getApiErrorMessage(error, 'Failed to save manager submission.'));
                },
              },
            );
          },
        },
      ],
    );
  };

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
          // Catch silently if the native Shared Object has already been released by unmounting
        }
      }
      setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      }).catch((err) => {
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
    const nextToProbe = audioAttachmentMeta.find((item) => !audioDurationById[item.id]);
    if (!nextToProbe) return;

    const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(nextToProbe.url));
    if (!replaced) return;
    setProbingAudioAttachmentId(nextToProbe.id);
  }, [
    activeAudioAttachmentId,
    previewPlayerStatus.playing,
    probingAudioAttachmentId,
    audioAttachmentIdsKey,
    audioDurationById,
    previewPlayer,
    runPreviewPlayerActionSafely,
  ]);

  useEffect(() => {
    if (!activeAudioAttachmentId) return;
    if (!audioAttachmentIds.includes(activeAudioAttachmentId)) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      setActiveAudioAttachmentId(null);
      setPendingPlayAudioId(null);
    }
  }, [activeAudioAttachmentId, audioAttachmentIdsKey, previewPlayer, runPreviewPlayerActionSafely]);

  useEffect(() => {
    if (!probingAudioAttachmentId) return;
    if (!audioAttachmentIds.includes(probingAudioAttachmentId)) {
      setProbingAudioAttachmentId(null);
    }
  }, [probingAudioAttachmentId, audioAttachmentIdsKey]);

  // On iOS, replace() loads the source asynchronously. Play only once isLoaded is true.
  useEffect(() => {
    if (!pendingPlayAudioId || !previewPlayerStatus.isLoaded) return;
    runPreviewPlayerActionSafely(() => previewPlayer.play());
    setPendingPlayAudioId(null);
  }, [pendingPlayAudioId, previewPlayerStatus.isLoaded, previewPlayer, runPreviewPlayerActionSafely]);

  const handleAudioAttachmentPress = (audioId: string, url: string) => {
    if (probingAudioAttachmentId) {
      setProbingAudioAttachmentId(null);
    }

    if (activeAudioAttachmentId !== audioId) {
      const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(url));
      if (!replaced) return;
      // Don't call play() immediately — on iOS, replace() loads asynchronously.
      // The pendingPlayAudioId effect will call play() once isLoaded becomes true.
      setPendingPlayAudioId(audioId);
      setActiveAudioAttachmentId(audioId);
      return;
    }

    if (previewPlayerStatus.playing) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      return;
    }

    const shouldRestart =
      previewPlayerStatus.didJustFinish
      || (
        previewPlayerStatus.duration > 0
        && previewPlayerStatus.currentTime >= previewPlayerStatus.duration
      );
    if (shouldRestart) {
      void previewPlayer.seekTo(0).catch(() => undefined);
    }
    runPreviewPlayerActionSafely(() => previewPlayer.play());
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
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
              <Text style={styles.heading} numberOfLines={1}>Task Details</Text>
            </View>
            <Text style={styles.subheading}>Task #{task.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={styles.headerActions}>
            {isAdmin && (
              <>
                <TouchableOpacity
                  style={[styles.iconActionBtn, styles.editActionBtn]}
                  onPress={() => setShowEditModal(true)}
                  activeOpacity={0.82}
                >
                  <Ionicons name="create-outline" size={18} color={colors.textInverse} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconActionBtn, styles.deleteActionBtn, deleteTask.isPending && styles.iconActionBtnDisabled]}
                  onPress={handleDelete}
                  disabled={deleteTask.isPending}
                  activeOpacity={0.82}
                >
                  {deleteTask.isPending ? (
                    <ActivityIndicator color={colors.textInverse} size="small" />
                  ) : (
                    <Ionicons name="trash-outline" size={18} color={colors.textInverse} />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

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
                <StatusBadge status={task.status} />
                <View style={[styles.priorityBadge, { backgroundColor: (PRIORITY_COLORS[task.priority] ?? colors.textSecondary) + '22' }]}>
                  <Text style={[styles.priorityText, { color: PRIORITY_COLORS[task.priority] ?? colors.textSecondary }]}>
                    {task.priority}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Row label="Due Date" value={formatDate(task.dueDate, task.dueTime)} />
          {assigneeNames.length > 0 && (
            <Row label="Assigned To" value={assigneeNames.join(', ')} />
          )}
          <Row label="Created" value={formatDate(task.createdAt)} />
          {task.completedAt && (
            <Row label="Completed" value={formatDate(task.completedAt)} />
          )}

          <Text style={styles.ownerDescriptionLabel}>Description</Text>
          <Text style={styles.description}>{task.description}</Text>

          {hasAttachments && (
            <View style={styles.attachmentsInlineWrap}>
              <Text style={styles.ownerDescriptionLabel}>Attachments</Text>
              {imageAttachments.length > 0 && (
                <View style={styles.attachmentGroup}>
                  <Text style={styles.attachmentGroupTitle}>Images</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.imageRow}
                  >
                    {imageAttachments.map((url, index) => (
                      <TouchableOpacity
                        key={`image-${url}-${index}`}
                        onPress={() => { void openAttachment(url, 'image'); }}
                        style={styles.imageItem}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: url }} style={styles.imageThumb} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {videoAttachments.length > 0 && (
                <View style={styles.attachmentGroup}>
                  <Text style={styles.attachmentGroupTitle}>Videos</Text>
                  {videoAttachments.map((url, index) => (
                    <TouchableOpacity
                      key={`video-${url}-${index}`}
                      style={styles.attachmentRow}
                      onPress={() => { void openAttachment(url, 'video'); }}
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

              {savedAudioAttachments.length > 0 && (
                <SubmissionBlock
                  title="Audio"
                  onOpenAttachment={openAttachment}
                  attachments={{ audios: savedAudioAttachments }}
                  audioAttachmentMeta={audioAttachmentMeta}
                  audioPlayerStatus={previewPlayerStatus}
                  activeAudioAttachmentId={activeAudioAttachmentId}
                  audioDurationById={audioDurationById}
                  onAudioPress={handleAudioAttachmentPress}
                />
              )}

              {fileAttachments.length > 0 && (
                <View style={styles.attachmentGroup}>
                  <Text style={styles.attachmentGroupTitle}>Files</Text>
                  {fileAttachments.map((url, index) => (
                    <TouchableOpacity
                      key={`file-${url}-${index}`}
                      style={styles.attachmentRow}
                      onPress={() => { void openAttachment(url, 'file'); }}
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

        {task.status !== 'COMPLETED' && !isAdmin ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingWrap}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Manager Submission</Text>
              </View>
            </View>

            <View style={styles.managerCard}>
              <TextInput
                style={styles.managerTextInput}
                placeholder="Add manager notes..."
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
                    <TouchableOpacity style={styles.recordingActionBtn} onPress={() => { void discardAudioRecording(); }}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.recordingActionBtn, styles.stopRecordingBtn]} onPress={() => { void stopAudioRecording(); }}>
                      <Ionicons name="stop" size={18} color={colors.textInverse} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.managerActionsRow}>
                  <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void takePhoto(); }} disabled={uploadingType !== null || recordingBusy}>
                    <Ionicons name="camera-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void pickImage(); }} disabled={uploadingType !== null || recordingBusy}>
                    <Ionicons name="image-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void pickVideo(); }} disabled={uploadingType !== null || recordingBusy}>
                    <Ionicons name="videocam-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>Video</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void pickFile(); }} disabled={uploadingType !== null || recordingBusy}>
                    <Ionicons name="document-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>File</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void startAudioRecording(); }} disabled={uploadingType !== null || recordingBusy}>
                    <Ionicons name="mic-outline" size={15} color={colors.primaryDark} />
                    <Text style={styles.managerActionBtnText}>Voice</Text>
                  </TouchableOpacity>
                </View>
              )}

              {uploadingType && (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.uploadingText}>Uploading {uploadingType.slice(0, -1)}...</Text>
                </View>
              )}

              {(managerAttachments.images.length > 0
                || managerAttachments.videos.length > 0
                || managerAttachments.audios.length > 0
                || managerAttachments.files.length > 0) && (
                  <SubmissionBlock
                    title="Attached"
                    text={undefined}
                    attachments={managerAttachments}
                    onOpenAttachment={(url, type) => { void openAttachment(url, type); }}
                    onRemoveAttachment={removeAttachmentUrl}
                    audioAttachmentMeta={audioAttachmentMeta}
                    audioPlayerStatus={previewPlayerStatus}
                    activeAudioAttachmentId={activeAudioAttachmentId}
                    audioDurationById={audioDurationById}
                    onAudioPress={handleAudioAttachmentPress}
                  />
                )}



              <View style={styles.managerTagGroup}>
                {managerAttachments.images.map((url, index) => (
                  <TouchableOpacity
                    key={`manager-image-${url}-${index}`}
                    style={styles.attachmentTag}
                    onLongPress={() => removeAttachmentUrl('images', index)}
                  >
                    <Text style={styles.attachmentTagText} numberOfLines={1}>{buildAttachmentName(url, 'image', index)}</Text>
                  </TouchableOpacity>
                ))}
                {managerAttachments.videos.map((url, index) => (
                  <TouchableOpacity
                    key={`manager-video-${url}-${index}`}
                    style={styles.attachmentTag}
                    onLongPress={() => removeAttachmentUrl('videos', index)}
                  >
                    <Text style={styles.attachmentTagText} numberOfLines={1}>{buildAttachmentName(url, 'video', index)}</Text>
                  </TouchableOpacity>
                ))}
                {managerAttachments.files.map((url, index) => (
                  <TouchableOpacity
                    key={`manager-file-${url}-${index}`}
                    style={styles.attachmentTag}
                    onLongPress={() => removeAttachmentUrl('files', index)}
                  >
                    <Text style={styles.attachmentTagText} numberOfLines={1}>{buildAttachmentName(url, 'file', index)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveManagerBtn, updateTask.isPending && styles.iconActionBtnDisabled]}
                onPress={saveManagerSubmission}
                disabled={updateTask.isPending}
              >
                {updateTask.isPending ? (
                  <ActivityIndicator color={colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.saveManagerBtnText}>Save Submission</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          (managerText.trim().length > 0
            || managerAttachments.images.length > 0
            || managerAttachments.videos.length > 0
            || managerAttachments.audios.length > 0
            || managerAttachments.files.length > 0) ? (
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
                onOpenAttachment={(url, type) => { void openAttachment(url, type); }}
                audioAttachmentMeta={audioAttachmentMeta}
                audioPlayerStatus={previewPlayerStatus}
                activeAudioAttachmentId={activeAudioAttachmentId}
                audioDurationById={audioDurationById}
                onAudioPress={handleAudioAttachmentPress}
              />
            </>
          ) : null
        )}
      </ScrollView>

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
              onSuccess={() => {
                setShowEditModal(false);
              }}
              editTask={task}
              submitLabel="Save Changes"
              bottomPadding={24}
              fill
              backgroundColor={colors.surface}
            />
          </View>
        </View>
      </Modal>

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
            <Image
              source={{ uri: viewerImageUrl }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headingWrap: {
    flex: 1,
  },
  heading: {
    fontSize: 34,
    lineHeight: 40,
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
  deleteActionBtn: {
    backgroundColor: colors.error,
  },
  editActionBtn: {
    backgroundColor: colors.primary,
  },
  iconActionBtnDisabled: {
    opacity: 0.6,
  },
  editModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
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
  editSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  editSheetClose: {
    padding: 4,
  },

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
  viewerImage: {
    width: '100%',
    height: '100%',
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#D3C5AC40',
    ...shadow.sm,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ownerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ownerHeadingWrap: {
    flex: 1,
    gap: 2,
  },
  ownerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ownerTitle: {
    fontSize: typography.md,
    color: colors.text,
    fontWeight: typography.bold,
  },
  ownerOutlet: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  ownerBadgeWrap: {
    alignItems: 'flex-end',
  },
  ownerStatusPriorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  priorityText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },
  description: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ownerDescriptionLabel: {
    marginTop: spacing.sm,
    marginBottom: 4,
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  overdueTag: {
    color: colors.error,
    fontSize: typography.xs,
    marginTop: spacing.xs,
    fontWeight: typography.semibold,
  },
  overdueTopTag: {
    color: colors.error,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },

  sectionHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#EAB308',
  },
  sectionTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#4F4633',
    fontWeight: typography.bold,
  },
  sectionCount: {
    minWidth: 22,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#E6E8EA',
    color: colors.text,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: typography.bold,
  },

  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  submissionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },

  attachmentsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  attachmentsInlineWrap: {
    marginTop: spacing.sm,
  },
  attachmentGroup: {
    marginBottom: spacing.sm,
  },
  attachmentGroupTitle: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
    marginBottom: spacing.xs,
  },
  imageRow: {
    gap: spacing.sm,
    paddingTop: 2,
  },
  imageItem: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageThumb: {
    width: 108,
    height: 108,
    backgroundColor: colors.surfaceElevated,
  },
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
  attachmentName: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    flex: 1,
  },
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
  audioPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  waveformRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  waveformBar: {
    width: 3,
    borderRadius: radius.full,
  },
  audioDurationText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    minWidth: 76,
    textAlign: 'right',
  },
  removeAudioBtn: {
    padding: 4,
  },
  managerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
    marginBottom: spacing.md,
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
  managerActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
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
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  uploadingText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  managerDraftPreview: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  managerTagGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  attachmentTag: {
    maxWidth: '100%',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  attachmentTagText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
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
  recordingTimerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.error,
  },
  recordingTimerText: {
    fontSize: typography.md,
    color: colors.error,
    fontWeight: typography.bold,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  stopRecordingBtn: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
});
