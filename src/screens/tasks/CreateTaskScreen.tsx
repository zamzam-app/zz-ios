import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  Image,
  Linking,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DatePickerModal from '../../components/DatePickerModal';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  cancelUploadJob,
  enqueueCloudinaryUpload,
  removeUploadJob,
  waitForUploadJob,
} from '../../api/endpoints/uploadQueue';
import { useCreateTask, useTaskCategories } from '../../hooks/useTasks';
import { useOutlets } from '../../hooks/useOutlets';
import { useManagers } from '../../hooks/useUsers';
import { TaskPriority, TaskCategoryOption, CreateTaskPayload, Task } from '../../api/endpoints/tasks';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { enqueueTaskSubmission } from '../../api/endpoints/taskSubmissionQueue';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const WEEK_DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({ id: String(i + 1), name: String(i + 1) }));
const WAVEFORM_BARS = [6, 10, 14, 8, 16, 7, 13, 9, 15, 6, 12, 10, 14, 7, 11, 9];
const AUDIO_FILE_WAIT_RETRIES = 25;
const AUDIO_FILE_WAIT_DELAY_MS = 120;

type AttachmentType = 'image' | 'video' | 'audio' | 'file';

type AttachmentItem = {
  id: string;
  type: AttachmentType;
  name: string;
  uri: string;
  status: 'uploading' | 'uploaded' | 'failed';
  uploadJobId?: string;
  remoteUrl?: string;
  error?: string;
  durationMillis?: number;
};

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {text}
      {required && <Text style={{ color: colors.error }}> *</Text>}
    </Text>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          style={[styles.chip, value === o && styles.chipActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>
            {o.replace(/_/g, ' ')}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CategoryChipGroup({
  options,
  value,
  onChange,
}: {
  options: TaskCategoryOption[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[styles.chip, value === option.id && styles.chipActive]}
          onPress={() => onChange(option.id)}
        >
          <Text style={[styles.chipText, value === option.id && styles.chipTextActive]}>
            {option.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PickerModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  multi,
}: {
  visible: boolean;
  title: string;
  items: { id: string; name: string }[];
  selected: string | string[];
  onSelect: (id: string) => void;
  onClose: () => void;
  multi?: boolean;
}) {
  const selectedArr = Array.isArray(selected) ? selected : [selected];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.pickerRoot}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalDone}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const isSelected = selectedArr.includes(item.id);
            return (
              <TouchableOpacity style={styles.pickerRow} onPress={() => onSelect(item.id)}>
                <Text style={styles.pickerName}>{item.name}</Text>
                {isSelected && <Text style={styles.pickerTick}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

function getAttachmentIcon(type: AttachmentType): keyof typeof MaterialCommunityIcons.glyphMap {
  if (type === 'image') return 'image-outline';
  if (type === 'video') return 'video-outline';
  if (type === 'audio') return 'microphone-outline';
  return 'file-outline';
}

function isReleasedAudioPlayerError(error: unknown) {
  return (
    error instanceof Error
    && /already released|cannot be cast to type expo\.modules\.audio\.AudioPlayer/i.test(error.message)
  );
}

type CreateTaskContentProps = {
  onSuccess: () => void;
  submitLabel?: string;
  bottomPadding?: number;
  fill?: boolean;
  backgroundColor?: string;
  initialIsRecurring?: boolean;
  hideRecurringToggle?: boolean;
  editTask?: Task;
};

export function CreateTaskContent({
  onSuccess,
  submitLabel = 'Create Task',
  bottomPadding = 40,
  fill = true,
  backgroundColor = colors.background,
  initialIsRecurring = false,
  hideRecurringToggle = false,
  editTask,
}: CreateTaskContentProps) {
  const [description, setDescription] = useState(editTask?.description ?? '');
  const [taskCategoryId, setTaskCategoryId] = useState<string | undefined>(editTask?.taskCategory?._id ?? editTask?.category);
  const [priority, setPriority] = useState<TaskPriority>(editTask?.priority ?? 'MEDIUM');
  const [dueDate, setDueDate] = useState(editTask?.dueDate ? new Date(editTask.dueDate) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(editTask?.isRecurring ?? initialIsRecurring);
  const [recurrenceType, setRecurrenceType] = useState<'WEEKLY' | 'MONTHLY'>(editTask?.recurrenceType ?? 'WEEKLY');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(editTask?.recurrenceDays ?? []);

  useEffect(() => {
    if (!editTask) return;
    setDescription(editTask.description);
    setTaskCategoryId(editTask.taskCategory?._id ?? editTask.category);
    setPriority(editTask.priority);
    setDueDate(new Date(editTask.dueDate));
    setIsRecurring(!!editTask.isRecurring);
    setRecurrenceType(editTask.recurrenceType ?? 'WEEKLY');
    setRecurrenceDays(editTask.recurrenceDays ?? []);
    setOutletId(editTask.outlet?._id ?? editTask.outletId ?? '');
    setAssigneeIds(editTask.assigneeIds ?? []);
    
    // Map existing attachments
    const existing: AttachmentItem[] = [];
    const atts = editTask.adminSubmission?.attachments;
    if (atts) {
      atts.images?.forEach(url => existing.push({ id: url, type: 'image', name: url.split('/').pop() || 'image', uri: url, status: 'uploaded', remoteUrl: url }));
      atts.videos?.forEach(url => existing.push({ id: url, type: 'video', name: url.split('/').pop() || 'video', uri: url, status: 'uploaded', remoteUrl: url }));
      atts.audios?.forEach(url => existing.push({ id: url, type: 'audio', name: url.split('/').pop() || 'audio', uri: url, status: 'uploaded', remoteUrl: url }));
      atts.files?.forEach(url => existing.push({ id: url, type: 'file', name: url.split('/').pop() || 'file', uri: url, status: 'uploaded', remoteUrl: url }));
    }
    setAttachments(existing);
  }, [editTask?.id]);

  useEffect(() => {
    setIsRecurring(initialIsRecurring);
  }, [initialIsRecurring]);

  const [showMonthDaysPicker, setShowMonthDaysPicker] = useState(false);
  const [outletId, setOutletId] = useState(editTask?.outlet?._id ?? editTask?.outletId ?? '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(editTask?.assigneeIds ?? []);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  const [activeAudioAttachmentId, setActiveAudioAttachmentId] = useState<string | null>(null);
  const [pendingPlayAudioId, setPendingPlayAudioId] = useState<string | null>(null);

  const { data: outlets } = useOutlets();
  const { data: managers } = useManagers();
  const {
    data: taskCategories,
    isLoading: isLoadingTaskCategories,
    isError: isTaskCategoriesError,
    isFetching: isFetchingTaskCategories,
    refetch: refetchTaskCategories,
  } = useTaskCategories();
  const createTask = useCreateTask();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const previewPlayer = useAudioPlayer(null, { updateInterval: 150 });
  const previewPlayerStatus = useAudioPlayerStatus(previewPlayer);
  const isRecordingAudio = recorderState.isRecording;
  const recordingMillis = recorderState.durationMillis;

  const selectedOutlet = outlets?.find((o) => o.id === outletId);
  const filteredManagers = useMemo(() => {
    const allManagers = managers ?? [];
    if (!outletId) return allManagers;
    const fromUserOutlets = allManagers.filter((manager) => manager.outlets?.includes(outletId));
    if (fromUserOutlets.length > 0) return fromUserOutlets;

    const selectedOutletManagerIds = selectedOutlet?.managerIds ?? [];
    return allManagers.filter((manager) => selectedOutletManagerIds.includes(manager.id));
  }, [managers, outletId, selectedOutlet?.managerIds]);
  const selectedManagers = filteredManagers.filter((m) => assigneeIds.includes(m.id));
  const hasTaskCategories = (taskCategories?.length ?? 0) > 0;
  const hasAssignees = assigneeIds.length > 0;
  const hasPendingAttachmentUploads = attachments.some((item) => item.status === 'uploading');
  const hasFailedAttachmentUploads = attachments.some((item) => item.status === 'failed');
  const selectedPreviewAttachment = previewAttachmentId
    ? attachments.find((item) => item.id === previewAttachmentId)
    : undefined;

  const runPreviewPlayerActionSafely = useCallback((action: () => unknown): boolean => {
    try {
      const result = action();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((error) => {
          if (!isReleasedAudioPlayerError(error)) {
            // Keep logging unexpected errors but avoid interrupting task creation flow.
            console.warn('[CreateTask] Preview player action failed', error);
          }
        });
      }
      return true;
    } catch (error) {
      if (!isReleasedAudioPlayerError(error)) {
        console.warn('[CreateTask] Preview player action failed', error);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    setAssigneeIds((prev) => prev.filter((id) => filteredManagers.some((manager) => manager.id === id)));
  }, [filteredManagers]);

  useEffect(() => {
    return () => {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, [previewPlayer, runPreviewPlayerActionSafely]);

  useEffect(() => {
    if (!previewAttachmentId) return;
    if (!attachments.some((item) => item.id === previewAttachmentId)) {
      setPreviewAttachmentId(null);
    }
  }, [attachments, previewAttachmentId]);

  useEffect(() => {
    if (!activeAudioAttachmentId) return;
    const stillExists = attachments.some((item) => item.id === activeAudioAttachmentId && item.type === 'audio');
    if (!stillExists) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      setActiveAudioAttachmentId(null);
      setPendingPlayAudioId(null);
    }
  }, [attachments, activeAudioAttachmentId, previewPlayer, runPreviewPlayerActionSafely]);

  useEffect(() => {
    if (previewPlayerStatus.didJustFinish) {
      setActiveAudioAttachmentId(null);
    }
  }, [previewPlayerStatus.didJustFinish]);

  // On iOS, replace() loads the source asynchronously. Play only once isLoaded is true.
  useEffect(() => {
    if (!pendingPlayAudioId || !previewPlayerStatus.isLoaded) return;
    runPreviewPlayerActionSafely(() => previewPlayer.play());
    setPendingPlayAudioId(null);
  }, [pendingPlayAudioId, previewPlayerStatus.isLoaded, previewPlayer, runPreviewPlayerActionSafely]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

  const saveRecordedAudioAttachment = async (uri: string, duration: number): Promise<boolean> => {
    const normalizedDuration = Math.max(0, duration);
    try {
      const uploadUri = await stageRecordedAudioForUpload(uri);
      addAttachment('audio', uploadUri, `Voice note ${formatDuration(normalizedDuration)}`, {
        durationMillis: normalizedDuration,
      });
      return true;
    } catch {
      Alert.alert('Error', 'Could not prepare the recorded audio for upload. Please try recording again.');
      return false;
    }
  };

  const startAttachmentUpload = async (attachmentId: string, uri: string) => {
    try {
      const job = await enqueueCloudinaryUpload(uri, 'tasks');
      setAttachments((prev) => prev.map((item) => (
        item.id === attachmentId
          ? { ...item, uploadJobId: job.id, status: 'uploading', error: undefined }
          : item
      )));

      const remoteUrl = await waitForUploadJob(job.id);
      setAttachments((prev) => prev.map((item) => (
        item.id === attachmentId
          ? { ...item, status: 'uploaded', remoteUrl, error: undefined }
          : item
      )));

      // We don't remove the job here anymore because the background submission queue needs it
      // void removeUploadJob(job.id);
    } catch (error) {
      setAttachments((prev) => prev.map((item) => (
        item.id === attachmentId
          ? {
            ...item,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Upload failed',
          }
          : item
      )));
    }
  };

  const addAttachment = (
    type: AttachmentType,
    uri: string,
    name: string,
    extra: Partial<Pick<AttachmentItem, 'durationMillis'>> = {},
  ) => {
    const attachmentId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setAttachments((prev) => [
      ...prev,
      {
        id: attachmentId,
        type,
        uri,
        name,
        status: 'uploading',
        ...extra,
      },
    ]);
    void startAttachmentUpload(attachmentId, uri);
  };

  const removeAttachment = (id: string) => {
    if (activeAudioAttachmentId === id) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      setActiveAudioAttachmentId(null);
    }
    if (previewAttachmentId === id) {
      setPreviewAttachmentId(null);
    }
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.uploadJobId) {
        void cancelUploadJob(target.uploadJobId);
        void removeUploadJob(target.uploadJobId);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const pickMedia = async (kind: 'image' | 'video') => {
    setShowAttachmentMenu(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Media library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'image' ? 'images' : 'videos',
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const picked = result.assets[0];
    const fallbackName = `${kind}-${attachments.length + 1}`;
    addAttachment(kind, picked.uri, picked.fileName ?? fallbackName);
  };

  const takePhoto = async () => {
    setShowAttachmentMenu(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const picked = result.assets[0];
    const fallbackName = `photo-${attachments.length + 1}.jpg`;
    addAttachment('image', picked.uri, picked.fileName ?? fallbackName);
  };

  const pickFile = async () => {
    setShowAttachmentMenu(false);
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: '*/*',
    });
    if (result.canceled || !result.assets?.length) return;

    result.assets.forEach((asset) => {
      addAttachment('file', asset.uri, asset.name);
    });
  };

  const startAudioRecording = async () => {
    if (recordingBusy || isRecordingAudio) return;
    setRecordingBusy(true);
    setShowAttachmentMenu(false);
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
    } catch {
      Alert.alert('Error', 'Could not start recording. Please try again.');
    } finally {
      setRecordingBusy(false);
    }
  };

  const stopAudioRecording = async () => {
    if (recordingBusy || !isRecordingAudio) return;
    setRecordingBusy(true);
    try {
      const durationBeforeStop = Math.max(0, recordingMillis ?? 0);
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status.url || recorder.uri || null;
      if (uri) {
        const duration = Math.max(0, durationBeforeStop, status.durationMillis ?? 0);
        const saved = await saveRecordedAudioAttachment(uri, duration);
        if (!saved) {
          return;
        }
      }
    } catch {
      const fallbackStatus = recorder.getStatus();
      const fallbackUri = fallbackStatus.url || recorder.uri || null;
      const fallbackDuration = Math.max(0, recordingMillis ?? 0, fallbackStatus.durationMillis ?? 0);
      if (fallbackUri) {
        const saved = await saveRecordedAudioAttachment(fallbackUri, fallbackDuration);
        if (saved) {
          return;
        }
      }
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

  const handleAudioAttachmentPress = (item: AttachmentItem) => {
    if (activeAudioAttachmentId !== item.id) {
      const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(item.uri));
      if (!replaced) return;
      // Don't call play() immediately — on iOS, replace() loads asynchronously.
      // The pendingPlayAudioId effect will call play() once isLoaded becomes true.
      setPendingPlayAudioId(item.id);
      setActiveAudioAttachmentId(item.id);
      setPreviewAttachmentId(item.id);
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
    setPreviewAttachmentId(item.id);
  };

  const openAttachmentExternally = async (item: AttachmentItem) => {
    const label = item.type === 'video' ? 'video' : 'file';
    try {
      let previewUri = item.uri;
      
      // Handle PDF files specifically to open in-app
      if (previewUri.toLowerCase().endsWith('.pdf') || (item.type === 'file' && item.name.toLowerCase().endsWith('.pdf'))) {
        try {
          let localUri = previewUri;
          // If it's a remote URL, download it first
          if (previewUri.startsWith('http')) {
            const fileName = previewUri.split('/').pop()?.split('?')[0] || item.name || 'document.pdf';
            localUri = `${FileSystem.cacheDirectory}${fileName}`;
            const downloadRes = await FileSystem.downloadAsync(previewUri, localUri);
            if (downloadRes.status !== 200) throw new Error('Download failed');
            localUri = downloadRes.uri;
          }

          await Sharing.shareAsync(localUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Open PDF',
            UTI: 'com.adobe.pdf',
          });
          return;
        } catch (error) {
          console.warn('[CreateTask] Failed to open PDF in-app', error);
        }
      }

      if (Platform.OS === 'android' && previewUri.startsWith('file://')) {
        try {
          previewUri = await FileSystem.getContentUriAsync(previewUri);
        } catch {
          // Fallback to file URI if content URI conversion is unavailable.
        }
      }

      const supported = await Linking.canOpenURL(previewUri);
      if (!supported) {
        Alert.alert('Preview unavailable', `Unable to open this ${label} on your device.`);
        return;
      }
      await Linking.openURL(previewUri);
    } catch {
      Alert.alert('Preview unavailable', `Unable to open this ${label} on your device.`);
    }
  };

  const handleAttachmentPress = (item: AttachmentItem) => {
    setShowAttachmentMenu(false);
    if (item.type === 'audio') {
      handleAudioAttachmentPress(item);
      return;
    }

    if (item.type === 'video' || item.type === 'file') {
      if (previewPlayerStatus.playing) {
        runPreviewPlayerActionSafely(() => previewPlayer.pause());
      }
      setActiveAudioAttachmentId(null);
      setPreviewAttachmentId(null);
      void openAttachmentExternally(item);
      return;
    }

    if (previewPlayerStatus.playing) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
    }
    setActiveAudioAttachmentId(null);
    setPreviewAttachmentId((prev) => (prev === item.id ? null : item.id));
  };

  const handleSubmit = () => {
    if (!description.trim()) return Alert.alert('Required', 'Please enter a description.');
    if (!taskCategoryId) return Alert.alert('Required', 'Please select a category.');
    if (!hasAssignees) return Alert.alert('Required', 'Please assign at least one manager.');
    if (isRecurring && recurrenceDays.length === 0) {
      const typeLabel = recurrenceType === 'WEEKLY' ? 'days of the week' : 'days of the month';
      return Alert.alert('Required', `Please select at least one day for ${typeLabel}.`);
    }

    if (hasFailedAttachmentUploads) {
      return Alert.alert(
        'Upload Failed',
        'Some attachments failed to upload. Please remove them or try again before submitting.',
      );
    }

    const attachmentJobs = attachments
      .filter((a) => a.status === 'uploading' && a.uploadJobId)
      .map((a) => ({ id: a.uploadJobId!, type: a.type }));

    const existingAttachments = {
      images: attachments.filter(a => a.type === 'image' && a.remoteUrl).map(a => a.remoteUrl!),
      videos: attachments.filter(a => a.type === 'video' && a.remoteUrl).map(a => a.remoteUrl!),
      audios: attachments.filter(a => a.type === 'audio' && a.remoteUrl).map(a => a.remoteUrl!),
      files: attachments.filter(a => a.type === 'file' && a.remoteUrl).map(a => a.remoteUrl!),
    };

    const payload: CreateTaskPayload = {
      description: description.trim(),
      taskCategoryId,
      priority,
      dueDate: dueDate.toISOString(),
      dueTime: `${dueDate.getHours().toString().padStart(2, '0')}:${dueDate.getMinutes().toString().padStart(2, '0')}`,
      isRecurring,
      ...(isRecurring ? { recurrenceType, recurrenceDays } : {}),
      ...(outletId ? { outletId } : {}),
      assigneeIds,
      adminSubmission: {
        text: '',
        attachments: existingAttachments
      }
    };

    void enqueueTaskSubmission(payload, attachmentJobs, editTask?.id);
    onSuccess();
  };

  return (
    <View style={[fill ? styles.rootFill : styles.rootAuto, { backgroundColor }]}>
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(bottomPadding, spacing.xl) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        <Label text="Description" required />
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Describe the task..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <View style={styles.attachmentSection}>
          <View style={styles.attachmentHeaderRow}>
            <Text style={styles.attachmentTitle}>ATTACHMENTS</Text>
            <View style={styles.attachmentHeaderActions}>
              <TouchableOpacity
                style={styles.attachmentHeaderIconButton}
                onPress={() => setShowAttachmentMenu((prev) => !prev)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="paperclip" size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.attachmentHeaderIconButton,
                  isRecordingAudio && styles.attachmentHeaderIconButtonActive,
                ]}
                onPress={() => {
                  if (isRecordingAudio) {
                    void stopAudioRecording();
                  } else {
                    void startAudioRecording();
                  }
                }}
                activeOpacity={0.85}
                disabled={recordingBusy}
              >
                <MaterialCommunityIcons
                  name={isRecordingAudio ? 'record-circle' : 'microphone-outline'}
                  size={18}
                  color={isRecordingAudio ? colors.error : colors.primary}
                />
              </TouchableOpacity>
              {isRecordingAudio && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={styles.recordingTimerText}>{formatDuration(recordingMillis)}</Text>
                  <TouchableOpacity
                    style={styles.attachmentHeaderIconButton}
                    onPress={() => { void discardAudioRecording(); }}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {showAttachmentMenu && (
            <View style={styles.attachmentInlineDropdown}>
              <TouchableOpacity
                style={styles.attachmentInlineDropdownItem}
                onPress={() => { void takePhoto(); }}
              >
                <View style={styles.attachmentInlineDropdownIconBox}>
                  <MaterialCommunityIcons name="camera-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.attachmentInlineDropdownText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachmentInlineDropdownItem}
                onPress={() => { void pickMedia('image'); }}
              >
                <View style={styles.attachmentInlineDropdownIconBox}>
                  <MaterialCommunityIcons name="image-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.attachmentInlineDropdownText}>Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachmentInlineDropdownItem}
                onPress={() => { void pickMedia('video'); }}
              >
                <View style={styles.attachmentInlineDropdownIconBox}>
                  <MaterialCommunityIcons name="video-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.attachmentInlineDropdownText}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentInlineDropdownItem}
                onPress={() => { void pickFile(); }}
              >
                <View style={styles.attachmentInlineDropdownIconBox}>
                  <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.attachmentInlineDropdownText}>File</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedPreviewAttachment && selectedPreviewAttachment.type === 'image' && (
            <View style={styles.attachmentPreviewCard}>
              <View style={styles.attachmentPreviewHeader}>
                <Text style={styles.attachmentPreviewTitle}>Preview</Text>
                <TouchableOpacity
                  onPress={() => removeAttachment(selectedPreviewAttachment.id)}
                  style={styles.attachmentPreviewDeleteBtn}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
              <Image
                source={{ uri: selectedPreviewAttachment.uri }}
                style={styles.attachmentPreviewImage}
                resizeMode="cover"
              />
              <Text style={styles.attachmentPreviewFileName} numberOfLines={1}>
                {selectedPreviewAttachment.name}
              </Text>
            </View>
          )}

          <View style={styles.attachmentListBox}>
            {attachments.length === 0 ? (
              <Text style={styles.noAttachmentsText}>No attachments</Text>
            ) : (
              <View style={styles.attachmentList}>
                {attachments.map((item) => {
                  const isAudio = item.type === 'audio';
                  const isPreviewed = previewAttachmentId === item.id;
                  const isActiveAudio = isAudio && activeAudioAttachmentId === item.id;
                  const totalSeconds = isAudio
                    ? Math.max(
                      (item.durationMillis ?? 0) / 1000,
                      isActiveAudio ? previewPlayerStatus.duration : 0,
                    )
                    : 0;
                  const currentSeconds = isActiveAudio ? previewPlayerStatus.currentTime : 0;
                  const currentMillis = Math.max(0, Math.floor(currentSeconds * 1000));
                  const totalMillis = Math.max(0, Math.floor(totalSeconds * 1000));
                  const progress = totalSeconds > 0 ? Math.min(currentSeconds / totalSeconds, 1) : 0;
                  const activeBarCount = Math.round(progress * WAVEFORM_BARS.length);
                  const statusLabel = item.status === 'uploaded'
                    ? 'Uploaded'
                    : item.status === 'failed'
                      ? 'Failed'
                      : 'Uploading';

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.attachmentChip, isPreviewed && styles.attachmentChipActive]}
                      onPress={() => handleAttachmentPress(item)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.attachmentChipHeader}>
                        <View style={styles.attachmentChipMeta}>
                          <MaterialCommunityIcons
                            name={getAttachmentIcon(item.type)}
                            size={16}
                            color={colors.primary}
                          />
                          <Text style={styles.attachmentChipText} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                        <View style={styles.attachmentChipRight}>
                          <Text
                            style={[
                              styles.attachmentStatusText,
                              item.status === 'failed'
                                ? styles.attachmentStatusFailed
                                : item.status === 'uploaded'
                                  ? styles.attachmentStatusUploaded
                                  : styles.attachmentStatusUploading,
                            ]}
                          >
                            {statusLabel}
                          </Text>
                          <TouchableOpacity
                            style={styles.removeAttachmentBtn}
                            onPress={(event) => {
                              event.stopPropagation();
                              removeAttachment(item.id);
                            }}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {item.status === 'failed' && item.error ? (
                        <Text style={styles.attachmentErrorText} numberOfLines={2}>
                          {item.error}
                        </Text>
                      ) : null}

                      {isAudio && (
                        <View style={styles.audioPreviewRow}>
                          <TouchableOpacity
                            style={styles.audioPlayBtn}
                            onPress={() => handleAttachmentPress(item)}
                          >
                            <MaterialCommunityIcons
                              name={isActiveAudio && previewPlayerStatus.playing ? 'pause' : 'play'}
                              size={18}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                          <View style={styles.waveformRow}>
                            {WAVEFORM_BARS.map((barHeight, index) => (
                              <View
                                key={`${item.id}-wave-${index}`}
                                style={[
                                  styles.waveformBar,
                                  {
                                    height: barHeight,
                                    backgroundColor: index < activeBarCount ? colors.primary : colors.border,
                                  },
                                ]}
                              />
                            ))}
                          </View>
                          <Text style={styles.audioDurationText}>
                            {`${formatDuration(currentMillis)} / ${formatDuration(totalMillis)}`}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <Label text="Category" required />
        {isLoadingTaskCategories ? (
          <View style={styles.fieldState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : hasTaskCategories ? (
          <CategoryChipGroup
            options={taskCategories ?? []}
            value={taskCategoryId}
            onChange={setTaskCategoryId}
          />
        ) : isTaskCategoriesError ? (
          <View style={styles.fieldState}>
            <Text style={styles.fieldError}>
              Unable to load task categories. Please try again.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, isFetchingTaskCategories && styles.retryBtnDisabled]}
              onPress={() => { void refetchTaskCategories(); }}
              disabled={isFetchingTaskCategories}
            >
              {isFetchingTaskCategories ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.retryBtnText}>Retry</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.fieldError}>No task categories available.</Text>
        )}

        <Label text="Priority" />
        <ChipGroup options={PRIORITIES} value={priority} onChange={setPriority} />

        <Label text="Due Date" required />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.inputValue}>
              {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.inputValue}>
              {dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </View>
        {!hideRecurringToggle && (
          <View style={styles.recurrenceRow}>
            <Text style={[styles.label, { marginTop: 0 }]}>Recurring Task</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={isRecurring ? colors.primary : '#f4f3f4'}
            />
          </View>
        )}

        <DatePickerModal
          visible={showDatePicker}
          value={dueDate}
          minimumDate={new Date()}
          onClose={() => setShowDatePicker(false)}
          onChange={(date) => {
            const newDate = new Date(date);
            newDate.setHours(dueDate.getHours(), dueDate.getMinutes(), 0, 0);
            setDueDate(newDate);
          }}
        />

        <DatePickerModal
          visible={showTimePicker}
          value={dueDate}
          mode="time"
          onClose={() => setShowTimePicker(false)}
          onChange={(date) => {
            const newDate = new Date(dueDate);
            newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
            setDueDate(newDate);
          }}
        />

        {isRecurring && (
          <View style={styles.recurrenceContainer}>
            <Label text="Recurrence Type" />
            <ChipGroup options={['WEEKLY', 'MONTHLY']} value={recurrenceType} onChange={(val: any) => { setRecurrenceType(val); setRecurrenceDays([]); }} />
            
            <Label text={recurrenceType === 'WEEKLY' ? 'Days of Week' : 'Days of Month'} required />
            {recurrenceType === 'WEEKLY' ? (
              <View style={styles.chipRow}>
                {WEEK_DAYS.map(o => (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.chip, recurrenceDays.includes(o.value) && styles.chipActive]}
                    onPress={() => {
                      setRecurrenceDays(prev => prev.includes(o.value) ? prev.filter(v => v !== o.value) : [...prev, o.value].sort((a,b)=>a-b));
                    }}
                  >
                    <Text style={[styles.chipText, recurrenceDays.includes(o.value) && styles.chipTextActive]}>
                      {o.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity style={styles.input} onPress={() => setShowMonthDaysPicker(true)}>
                <Text style={{ color: recurrenceDays.length > 0 ? colors.text : colors.textDisabled }}>
                  {recurrenceDays.length > 0
                    ? recurrenceDays.sort((a, b) => a - b).join(', ')
                    : 'Select days...'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Label text="Outlet" />
        <TouchableOpacity style={styles.input} onPress={() => setShowOutletPicker(true)}>
          <Text style={{ color: selectedOutlet ? colors.text : colors.textDisabled }}>
            {selectedOutlet?.name ?? 'Select outlet...'}
          </Text>
        </TouchableOpacity>

        <Label text="Assignees" required />
        <TouchableOpacity style={styles.input} onPress={() => setShowAssigneePicker(true)}>
          <Text style={{ color: selectedManagers.length > 0 ? colors.text : colors.textDisabled }}>
            {selectedManagers.length > 0
              ? selectedManagers.map((m) => m.name).join(', ')
              : outletId && filteredManagers.length === 0
                ? 'No managers available for selected outlet'
                : 'Select managers...'}
          </Text>
        </TouchableOpacity>

        {hasPendingAttachmentUploads && (
          <Text style={styles.pendingUploadHint}>Uploading attachments in background...</Text>
        )}

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (
              createTask.isPending
              || isLoadingTaskCategories
              || !hasTaskCategories
              || !hasAssignees
              || hasPendingAttachmentUploads
            ) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={
            createTask.isPending
            || isLoadingTaskCategories
            || !hasTaskCategories
            || !hasAssignees
            || hasPendingAttachmentUploads
          }
        >
          {createTask.isPending ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitBtnText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <PickerModal
        visible={showOutletPicker}
        title="Select Outlet"
        items={outlets ?? []}
        selected={outletId}
        onSelect={(id) => { setOutletId(id); setShowOutletPicker(false); }}
        onClose={() => setShowOutletPicker(false)}
      />

      <PickerModal
        visible={showMonthDaysPicker}
        title="Select Days of the Month"
        items={MONTH_DAYS}
        selected={recurrenceDays.map(String)}
        multi
        onSelect={(id) => {
          const num = Number(id);
          setRecurrenceDays((prev) => prev.includes(num) ? prev.filter(x => x !== num) : [...prev, num].sort((a, b) => a - b));
        }}
        onClose={() => setShowMonthDaysPicker(false)}
      />

      <PickerModal
        visible={showAssigneePicker}
        title="Select Assignees"
        items={filteredManagers}
        selected={assigneeIds}
        multi
        onSelect={(id) => {
          setAssigneeIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          );
        }}
        onClose={() => setShowAssigneePicker(false)}
      />

    </View>
  );
}

type Props = NativeStackScreenProps<TasksStackParamList, 'CreateTask'>;

export default function CreateTaskScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={[styles.rootFill, { backgroundColor: colors.background }]} edges={['bottom']}>
      <CreateTaskContent onSuccess={() => navigation.goBack()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootFill: { flex: 1 },
  rootAuto: {},
  formScroll: { flex: 1 },
  scroll: { paddingHorizontal: spacing.md, gap: spacing.sm },

  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
    marginBottom: 2,
    marginTop: spacing.sm,
  },
  recurrenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  recurrenceContainer: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  inputValue: { color: colors.text },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 13,
  },
  attachmentSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    position: 'relative',
    overflow: 'visible',
  },
  attachmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  attachmentTitle: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    letterSpacing: 0.4,
  },
  attachmentHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachmentHeaderIconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentHeaderIconButtonActive: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  recordingTimerText: {
    color: colors.error,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    minWidth: 48,
    textAlign: 'right',
  },
  attachmentInlineDropdown: {
    position: 'absolute',
    right: spacing.sm,
    top: 46,
    width: 170,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    zIndex: 20,
    elevation: 6,
  },
  attachmentInlineDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  attachmentInlineDropdownIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  attachmentInlineIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInlineDropdownText: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  attachmentListBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 92,
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  noAttachmentsText: {
    color: colors.textDisabled,
    fontSize: typography.sm,
    textAlign: 'center',
  },
  attachmentList: {
    gap: spacing.sm,
  },
  attachmentChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  attachmentChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  attachmentChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  attachmentChipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  attachmentChipText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sm,
  },
  attachmentChipRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachmentStatusText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
  attachmentStatusUploading: {
    color: colors.textSecondary,
  },
  attachmentStatusUploaded: {
    color: colors.success,
  },
  attachmentStatusFailed: {
    color: colors.error,
  },
  attachmentErrorText: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: typography.xs,
  },
  removeAttachmentBtn: {
    padding: 2,
  },
  audioPreviewRow: {
    marginTop: spacing.sm,
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
  attachmentPreviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  attachmentPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  attachmentPreviewDeleteBtn: {
    padding: 4,
  },
  attachmentPreviewTitle: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attachmentPreviewImage: {
    width: '100%',
    height: 200,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  attachmentPreviewFileName: {
    color: colors.text,
    fontSize: typography.sm,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse, fontWeight: typography.medium },
  fieldState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  fieldError: { color: colors.error, fontSize: typography.sm },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnDisabled: { opacity: 0.7 },
  retryBtnText: { color: colors.primary, fontSize: typography.sm, fontWeight: typography.medium },
  pendingUploadHint: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    fontSize: typography.sm,
  },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },

  pickerRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalDone: { color: colors.primary, fontSize: typography.base },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerName: { fontSize: typography.base, color: colors.text },
  pickerTick: { color: colors.primary, fontSize: 18 },
});
