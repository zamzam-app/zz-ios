import React, { useCallback, useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTask, useUpdateTaskStatus, useDeleteTask, useUpdateTask } from '../../hooks/useTasks';
import { TaskStatus } from '../../api/endpoints/tasks';
import StatusBadge from '../../components/StatusBadge';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';
import { uploadToCloudinary } from '../../api/endpoints/upload';
import { getApiErrorMessage } from '../../utils/errors';
import { useAuthStore } from '../../store/authStore';

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

function isReleasedAudioPlayerError(error: unknown) {
  return (
    error instanceof Error
    && /already released|cannot be cast to type expo\.modules\.audio\.AudioPlayer/i.test(error.message)
  );
}

function formatDate(iso?: string | null) {
  if (!iso) return 'Not set';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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
}: {
  title: string;
  text?: string;
  attachments?: {
    images?: string[];
    videos?: string[];
    audios?: string[];
    files?: string[];
  };
  onOpenAttachment: (url: string) => void;
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
                onPress={() => onOpenAttachment(url)}
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
          onPress={() => onOpenAttachment(url)}
          activeOpacity={0.8}
        >
          <View style={styles.attachmentRowLeft}>
            <Ionicons name="videocam-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.attachmentName} numberOfLines={1}>{buildAttachmentName(url, 'video', index)}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {audioItems.map((url, index) => (
        <TouchableOpacity
          key={`${title}-audio-${url}-${index}`}
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(url)}
          activeOpacity={0.8}
        >
          <View style={styles.attachmentRowLeft}>
            <Ionicons name="mic-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.attachmentName} numberOfLines={1}>{buildAttachmentName(url, 'audio', index)}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {fileItems.map((url, index) => (
        <TouchableOpacity
          key={`${title}-file-${url}-${index}`}
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(url)}
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
  const [activeAudioAttachmentId, setActiveAudioAttachmentId] = useState<string | null>(null);
  const [probingAudioAttachmentId, setProbingAudioAttachmentId] = useState<string | null>(null);
  const [audioDurationById, setAudioDurationById] = useState<Record<string, number>>({});
  const [managerText, setManagerText] = useState('');
  const [managerAttachments, setManagerAttachments] = useState<{
    images: string[];
    videos: string[];
    audios: string[];
    files: string[];
  }>({ images: [], videos: [], audios: [], files: [] });
  const [uploadingType, setUploadingType] = useState<null | 'images' | 'videos' | 'audios' | 'files'>(null);

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

  const openAttachment = async (url: string) => {
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

  const imageAttachments = task?.attachments?.images ?? task?.imageUrls ?? [];
  const videoAttachments = task?.attachments?.videos ?? [];
  const audioAttachments = task?.attachments?.audios ?? [];
  const fileAttachments = task?.attachments?.files ?? [];
  const audioAttachmentMeta = audioAttachments.map((url, index) => ({ id: `audio-${index}-${url}`, url }));
  const audioAttachmentIds = audioAttachmentMeta.map((item) => item.id);
  const audioAttachmentIdsKey = audioAttachmentIds.join('|');
  const attachmentCount = imageAttachments.length
    + videoAttachments.length
    + audioAttachments.length
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

  const pickVoice = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: false });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('audios', result.assets[0].uri);
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
    }
  }, [activeAudioAttachmentId, audioAttachmentIdsKey, previewPlayer, runPreviewPlayerActionSafely]);

  useEffect(() => {
    if (!probingAudioAttachmentId) return;
    if (!audioAttachmentIds.includes(probingAudioAttachmentId)) {
      setProbingAudioAttachmentId(null);
    }
  }, [probingAudioAttachmentId, audioAttachmentIdsKey]);

  const handleAudioAttachmentPress = (audioId: string, url: string) => {
    if (probingAudioAttachmentId) {
      setProbingAudioAttachmentId(null);
    }

    if (activeAudioAttachmentId !== audioId) {
      const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(url));
      if (!replaced) return;
      const played = runPreviewPlayerActionSafely(() => previewPlayer.play());
      if (!played) return;
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
            <Text style={styles.heading} numberOfLines={1}>Task Details</Text>
            <Text style={styles.subheading}>Task #{task.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={styles.headerActions}>
            {isAdmin && (
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

          <Row label="Due Date" value={formatDate(task.dueDate)} />
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
                        onPress={() => { void openAttachment(url); }}
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
                      onPress={() => { void openAttachment(url); }}
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

              {audioAttachments.length > 0 && (
                <View style={styles.attachmentGroup}>
                  <Text style={styles.attachmentGroupTitle}>Audio</Text>
                  {audioAttachmentMeta.map(({ id: audioId, url }, index) => {
                    const isActiveAudio = activeAudioAttachmentId === audioId;
                    const knownDurationMs = audioDurationById[audioId] ?? 0;
                    const liveDurationMs = isActiveAudio
                      ? Math.max(Math.floor(previewPlayerStatus.duration * 1000), knownDurationMs)
                      : knownDurationMs;
                    const currentMillis = isActiveAudio
                      ? Math.max(0, Math.floor(previewPlayerStatus.currentTime * 1000))
                      : 0;
                    const remainingMillis = Math.max(liveDurationMs - currentMillis, 0);
                    const progress = liveDurationMs > 0 ? Math.min(currentMillis / liveDurationMs, 1) : 0;
                    const activeBarCount = Math.round(progress * WAVEFORM_BARS.length);
                    const durationLabel = liveDurationMs > 0 ? formatDuration(remainingMillis) : '--:--';

                    return (
                      <View
                        key={`audio-${url}-${index}`}
                        style={styles.audioAttachmentCard}
                      >
                        <View style={styles.audioPreviewRow}>
                          <View style={styles.waveformRow}>
                            {WAVEFORM_BARS.map((barHeight, barIndex) => (
                              <View
                                key={`audio-wave-${url}-${barIndex}`}
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
                            onPress={() => handleAudioAttachmentPress(audioId, url)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={isActiveAudio && previewPlayerStatus.playing ? 'pause' : 'play'}
                              size={16}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {fileAttachments.length > 0 && (
                <View style={styles.attachmentGroup}>
                  <Text style={styles.attachmentGroupTitle}>Files</Text>
                  {fileAttachments.map((url, index) => (
                    <TouchableOpacity
                      key={`file-${url}-${index}`}
                      style={styles.attachmentRow}
                      onPress={() => { void openAttachment(url); }}
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

        {task.status !== 'COMPLETED' ? (
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

              <View style={styles.managerActionsRow}>
                <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void pickImage(); }} disabled={uploadingType !== null}>
                  <Ionicons name="image-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void pickVideo(); }} disabled={uploadingType !== null}>
                  <Ionicons name="videocam-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>Video</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void pickFile(); }} disabled={uploadingType !== null}>
                  <Ionicons name="document-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>File</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.managerActionBtn} onPress={() => { void pickVoice(); }} disabled={uploadingType !== null}>
                  <Ionicons name="mic-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>Voice</Text>
                </TouchableOpacity>
              </View>

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
                  onOpenAttachment={(url) => { void openAttachment(url); }}
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
                {managerAttachments.audios.map((url, index) => (
                  <TouchableOpacity
                    key={`manager-audio-${url}-${index}`}
                    style={styles.attachmentTag}
                    onLongPress={() => removeAttachmentUrl('audios', index)}
                  >
                    <Text style={styles.attachmentTagText} numberOfLines={1}>{buildAttachmentName(url, 'audio', index)}</Text>
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
                onOpenAttachment={(url) => { void openAttachment(url); }}
              />
            </>
          ) : null
        )}
      </ScrollView>
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
  iconActionBtnDisabled: {
    opacity: 0.7,
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
});
