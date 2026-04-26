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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTask, useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks';
import { TaskStatus } from '../../api/endpoints/tasks';
import StatusBadge from '../../components/StatusBadge';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from './taskDisplay';

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

export default function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const { data: task, isLoading } = useTask(taskId);
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const previewPlayer = useAudioPlayer(null, { updateInterval: 150 });
  const previewPlayerStatus = useAudioPlayerStatus(previewPlayer);
  const [activeAudioAttachmentId, setActiveAudioAttachmentId] = useState<string | null>(null);
  const [probingAudioAttachmentId, setProbingAudioAttachmentId] = useState<string | null>(null);
  const [audioDurationById, setAudioDurationById] = useState<Record<string, number>>({});

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
            <TouchableOpacity
              style={[styles.iconActionBtn, updateStatus.isPending && styles.iconActionBtnDisabled]}
              onPress={handleStatusChange}
              disabled={updateStatus.isPending}
              activeOpacity={0.82}
            >
              {updateStatus.isPending ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Ionicons name="checkmark-done-outline" size={18} color={colors.textInverse} />
              )}
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
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.topRow}>
            <StatusBadge status={task.status} />
            <View style={[styles.priorityBadge, { backgroundColor: (PRIORITY_COLORS[task.priority] ?? colors.textSecondary) + '22' }]}>
              <Text style={[styles.priorityText, { color: PRIORITY_COLORS[task.priority] ?? colors.textSecondary }]}>
                {task.priority}
              </Text>
            </View>
          </View>
          <Text style={styles.description}>{task.description}</Text>
          {isOverdue && <Text style={styles.overdueTag}>Overdue</Text>}
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeadingWrap}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Task Details</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          {outletName && <Row label="Outlet" value={outletName} />}
          {categoryName && <Row label="Category" value={categoryName} />}
          <Row label="Due Date" value={formatDate(task.dueDate)} />
          {assigneeNames.length > 0 && (
            <Row label="Assigned To" value={assigneeNames.join(', ')} />
          )}
          <Row label="Created" value={formatDate(task.createdAt)} />
          {task.completedAt && (
            <Row label="Completed" value={formatDate(task.completedAt)} />
          )}
        </View>

        {hasAttachments && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingWrap}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Attachments</Text>
              </View>
              <Text style={styles.sectionCount}>{attachmentCount}</Text>
            </View>

            <View style={styles.attachmentsCard}>
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
          </>
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
  overdueTag: {
    color: colors.error,
    fontSize: typography.xs,
    marginTop: spacing.xs,
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
});
