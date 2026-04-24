import React, { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
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
import { TaskPriority, TaskCategoryOption } from '../../api/endpoints/tasks';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { getApiErrorMessage } from '../../utils/errors';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

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

type CreateTaskContentProps = {
  onSuccess: () => void;
  submitLabel?: string;
  bottomPadding?: number;
  fill?: boolean;
  backgroundColor?: string;
};

export function CreateTaskContent({
  onSuccess,
  submitLabel = 'Create Task',
  bottomPadding = 40,
  fill = true,
  backgroundColor = colors.background,
}: CreateTaskContentProps) {
  const [description, setDescription] = useState('');
  const [taskCategoryId, setTaskCategoryId] = useState<string | undefined>();
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [outletId, setOutletId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [recordingBusy, setRecordingBusy] = useState(false);

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

  useEffect(() => {
    setAssigneeIds((prev) => prev.filter((id) => filteredManagers.some((manager) => manager.id === id)));
  }, [filteredManagers]);

  useEffect(() => {
    return () => {
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, []);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

      void removeUploadJob(job.id);
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

  const addAttachment = (type: AttachmentType, uri: string, name: string) => {
    const attachmentId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setAttachments((prev) => [
      ...prev,
      {
        id: attachmentId,
        type,
        uri,
        name,
        status: 'uploading',
      },
    ]);
    void startAttachmentUpload(attachmentId, uri);
  };

  const removeAttachment = (id: string) => {
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
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status.url;
      if (uri) {
        const duration = status.durationMillis;
        addAttachment('audio', uri, `Voice note ${formatDuration(duration)}`);
      }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {
      Alert.alert('Error', 'Could not stop recording. Please try again.');
    } finally {
      setRecordingBusy(false);
    }
  };

  const handleSubmit = () => {
    if (!description.trim()) return Alert.alert('Required', 'Please enter a description.');
    if (!taskCategoryId) return Alert.alert('Required', 'Please select a category.');
    if (!hasAssignees) return Alert.alert('Required', 'Please assign at least one manager.');
    if (hasPendingAttachmentUploads) {
      return Alert.alert('Uploading', 'Please wait for attachments to finish uploading.');
    }
    if (hasFailedAttachmentUploads) {
      return Alert.alert('Upload failed', 'Please remove failed attachments or try selecting them again.');
    }

    const uploaded = attachments.filter((item) => item.status === 'uploaded' && item.remoteUrl);
    const images = uploaded.filter((item) => item.type === 'image').map((item) => item.remoteUrl as string);
    const videos = uploaded.filter((item) => item.type === 'video').map((item) => item.remoteUrl as string);
    const audios = uploaded.filter((item) => item.type === 'audio').map((item) => item.remoteUrl as string);
    const files = uploaded.filter((item) => item.type === 'file').map((item) => item.remoteUrl as string);
    const hasUploadedAttachments = images.length > 0 || videos.length > 0 || audios.length > 0 || files.length > 0;

    createTask.mutate(
      {
        description: description.trim(),
        taskCategoryId,
        priority,
        dueDate: dueDate.toISOString(),
        ...(outletId ? { outletId } : {}),
        assigneeIds,
        ...(hasUploadedAttachments
          ? {
            adminSubmission: {
              attachments: {
                images,
                videos,
                audios,
                files,
              },
            },
          }
          : {}),
      },
      {
        onSuccess,
        onError: (error) =>
          Alert.alert('Error', getApiErrorMessage(error, 'Failed to create task. Please try again.')),
      },
    );
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

        <Label text="Attachments" />
        <View style={styles.attachmentSection}>
          <View style={styles.attachmentHeaderRow}>
            <Text style={styles.attachmentHint}>
              Add image, video, file or record live audio
            </Text>
            <TouchableOpacity
              style={styles.addAttachmentBtn}
              onPress={() => setShowAttachmentMenu((prev) => !prev)}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus" size={22} color={colors.textInverse} />
            </TouchableOpacity>
          </View>

          {showAttachmentMenu && (
            <View style={styles.attachmentMenu}>
              <TouchableOpacity
                style={styles.attachmentMenuItem}
                onPress={() => { void pickMedia('image'); }}
              >
                <MaterialCommunityIcons name="image-outline" size={18} color={colors.text} />
                <Text style={styles.attachmentMenuText}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentMenuItem}
                onPress={() => { void pickMedia('video'); }}
              >
                <MaterialCommunityIcons name="video-outline" size={18} color={colors.text} />
                <Text style={styles.attachmentMenuText}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentMenuItem}
                onPress={() => {
                  if (isRecordingAudio) {
                    void stopAudioRecording();
                  } else {
                    void startAudioRecording();
                  }
                }}
              >
                <MaterialCommunityIcons
                  name={isRecordingAudio ? 'stop-circle-outline' : 'microphone-outline'}
                  size={18}
                  color={isRecordingAudio ? colors.error : colors.text}
                />
                <Text style={[styles.attachmentMenuText, isRecordingAudio && { color: colors.error }]}>
                  {isRecordingAudio ? 'Stop Recording' : 'Record Audio'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentMenuItem}
                onPress={() => { void pickFile(); }}
              >
                <MaterialCommunityIcons name="file-outline" size={18} color={colors.text} />
                <Text style={styles.attachmentMenuText}>File</Text>
              </TouchableOpacity>
            </View>
          )}

          {isRecordingAudio && (
            <View style={styles.recordingBanner}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Recording {formatDuration(recordingMillis)}</Text>
            </View>
          )}

          {attachments.length === 0 ? (
            <Text style={styles.noAttachmentsText}>No attachments selected</Text>
          ) : (
            <View style={styles.attachmentList}>
              {attachments.map((item) => (
                <View key={item.id} style={styles.attachmentChip}>
                  <MaterialCommunityIcons
                    name={getAttachmentIcon(item.type)}
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.attachmentChipText} numberOfLines={1}>
                    {item.name}
                  </Text>
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
                    {item.status === 'uploaded'
                      ? 'Uploaded'
                      : item.status === 'failed'
                        ? 'Failed'
                        : 'Uploading'}
                  </Text>
                  <TouchableOpacity onPress={() => removeAttachment(item.id)}>
                    <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
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
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputValue}>
            {dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setDueDate(date);
            }}
          />
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
  },
  attachmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachmentHint: {
    color: colors.textSecondary,
    fontSize: typography.sm,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },
  addAttachmentBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  attachmentMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  attachmentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attachmentMenuText: {
    color: colors.text,
    fontSize: typography.base,
    fontWeight: typography.medium,
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FFECEA',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.error,
  },
  recordingText: {
    color: colors.error,
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
  noAttachmentsText: {
    color: colors.textDisabled,
    fontSize: typography.sm,
  },
  attachmentList: {
    gap: spacing.xs,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  attachmentChipText: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sm,
  },
  attachmentStatusText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    marginRight: spacing.xs,
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
