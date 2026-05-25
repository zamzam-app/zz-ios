import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { Task, CreateTaskPayload, TaskPriority } from '../../../api/endpoints/tasks';
import { enqueueTaskSubmission } from '../../../api/endpoints/tasks/taskSubmissionQueueApi';
import { useOutlets } from '../../../hooks/infrastructure';
import { useCreateTask, useTaskCategories } from '../../../hooks/tasks';
import { useManagers } from '../../../hooks/useUsers';

import { AttachmentItem, useTaskAttachmentUploads } from './useTaskAttachmentUploads';

type TaskFormMode = 'create' | 'edit';

function getTaskCategoryId(task?: Task) {
  return task?.taskCategory?._id ?? task?.category;
}

function getTaskOutletId(task?: Task) {
  return task?.outlet?._id ?? task?.outletId ?? '';
}

export function useCreateTaskFormState(
  editTask?: Task,
  initialIsRecurring = false,
  mode: TaskFormMode = editTask ? 'edit' : 'create',
) {
  const isEditMode = mode === 'edit';
  const [description, setDescription] = useState(editTask?.description ?? '');
  const [taskCategoryId, setTaskCategoryId] = useState<string | undefined>(
    getTaskCategoryId(editTask),
  );
  const [priority, setPriority] = useState<TaskPriority>(editTask?.priority ?? 'MEDIUM');
  const [dueDate, setDueDate] = useState(
    editTask?.dueDate ? new Date(editTask.dueDate) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(editTask?.isRecurring ?? initialIsRecurring);
  const [recurrenceType, setRecurrenceType] = useState<'WEEKLY' | 'MONTHLY'>(
    editTask?.recurrenceType ?? 'WEEKLY',
  );
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(editTask?.recurrenceDays ?? []);
  const [showMonthDaysPicker, setShowMonthDaysPicker] = useState(false);
  const [outletId, setOutletId] = useState(getTaskOutletId(editTask));
  const [assigneeIds, setAssigneeIds] = useState<string[]>(editTask?.assigneeIds ?? []);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [recordingBusy] = useState(false);

  const {
    showAttachmentMenu,
    setShowAttachmentMenu,
    attachments,
    previewAttachmentId,
    activeAudioAttachmentId,
    previewPlayerStatus,
    isRecordingAudio,
    recordingMillis,
    WAVEFORM_BARS: waveBars,
    WAVEFORM_BAR_SPECS,
    removeAttachment,
    setExistingAttachments,
    pickMedia,
    takePhoto,
    pickFile,
    startAudioRecording,
    stopAudioRecording,
    discardAudioRecording,
    handleAttachmentPress,
    openAttachmentExternally,
  } = useTaskAttachmentUploads();

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

  useEffect(() => {
    if (!isEditMode || !editTask) return;
    setDescription(editTask.description);
    setTaskCategoryId(getTaskCategoryId(editTask));
    setPriority(editTask.priority);
    setDueDate(new Date(editTask.dueDate));
    setIsRecurring(!!editTask.isRecurring);
    setRecurrenceType(editTask.recurrenceType ?? 'WEEKLY');
    setRecurrenceDays(editTask.recurrenceDays ?? []);
    setOutletId(getTaskOutletId(editTask));
    setAssigneeIds(editTask.assigneeIds ?? []);

    const existing: AttachmentItem[] = [];
    const atts = editTask.adminSubmission?.attachments;
    if (atts) {
      atts.images?.forEach((url) =>
        existing.push({
          id: url,
          type: 'image',
          name: url.split('/').pop() || 'image',
          uri: url,
          status: 'uploaded',
          remoteUrl: url,
        }),
      );
      atts.videos?.forEach((url) =>
        existing.push({
          id: url,
          type: 'video',
          name: url.split('/').pop() || 'video',
          uri: url,
          status: 'uploaded',
          remoteUrl: url,
        }),
      );
      atts.audios?.forEach((url) =>
        existing.push({
          id: url,
          type: 'audio',
          name: url.split('/').pop() || 'audio',
          uri: url,
          status: 'uploaded',
          remoteUrl: url,
        }),
      );
      atts.files?.forEach((url) =>
        existing.push({
          id: url,
          type: 'file',
          name: url.split('/').pop() || 'file',
          uri: url,
          status: 'uploaded',
          remoteUrl: url,
        }),
      );
    }
    setExistingAttachments(existing);
  }, [editTask, isEditMode, setExistingAttachments]);

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

  useEffect(() => {
    setAssigneeIds((prev) => {
      const next = prev.filter((id) => filteredManagers.some((manager) => manager.id === id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredManagers]);

  const handleSubmit = (onSuccess: () => void) => {
    const editTaskId = editTask?.id;
    if (isEditMode && !editTaskId) {
      console.error('[TaskForm] Cannot update task without an id.', { editTask });
      return Alert.alert('Cannot update task', 'Task details are still loading. Please try again.');
    }
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
      images: attachments.filter((a) => a.type === 'image' && a.remoteUrl).map((a) => a.remoteUrl!),
      videos: attachments.filter((a) => a.type === 'video' && a.remoteUrl).map((a) => a.remoteUrl!),
      audios: attachments.filter((a) => a.type === 'audio' && a.remoteUrl).map((a) => a.remoteUrl!),
      files: attachments.filter((a) => a.type === 'file' && a.remoteUrl).map((a) => a.remoteUrl!),
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
        attachments: existingAttachments,
      },
    };

    void enqueueTaskSubmission(payload, attachmentJobs, isEditMode ? editTaskId : undefined);
    onSuccess();
  };

  return {
    // Form state
    description,
    setDescription,
    taskCategoryId,
    setTaskCategoryId,
    priority,
    setPriority,
    dueDate,
    setDueDate,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    isRecurring,
    setIsRecurring,
    recurrenceType,
    setRecurrenceType,
    recurrenceDays,
    setRecurrenceDays,
    showMonthDaysPicker,
    setShowMonthDaysPicker,
    outletId,
    setOutletId,
    assigneeIds,
    setAssigneeIds,
    showOutletPicker,
    setShowOutletPicker,
    showAssigneePicker,
    setShowAssigneePicker,

    // Attachment state
    showAttachmentMenu,
    setShowAttachmentMenu,
    attachments,
    previewAttachmentId,
    activeAudioAttachmentId,
    previewPlayerStatus,
    isRecordingAudio,
    recordingMillis,
    recordingBusy,
    WAVEFORM_BARS: waveBars,
    WAVEFORM_BAR_SPECS,
    pickMedia,
    takePhoto,
    pickFile,
    startAudioRecording,
    stopAudioRecording,
    discardAudioRecording,
    handleAttachmentPress,
    openAttachmentExternally,
    removeAttachment,
    selectedPreviewAttachment,

    // Data
    outlets,
    managers,
    taskCategories,
    isLoadingTaskCategories,
    isTaskCategoriesError,
    isFetchingTaskCategories,
    refetchTaskCategories,
    createTask,
    isEditMode,

    // Derived
    selectedOutlet,
    filteredManagers,
    selectedManagers,
    hasTaskCategories,
    hasAssignees,
    hasPendingAttachmentUploads,
    hasFailedAttachmentUploads,

    // Actions
    handleSubmit,
  };
}
