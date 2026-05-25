import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Task } from '../../api/endpoints/tasks';
import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { colors } from '../../theme/theme';

import { CreateTaskForm } from './components/CreateTaskForm';
import { useCreateTaskFormState } from './hooks/useCreateTaskFormState';

interface CreateTaskContentProps {
  onSuccess: () => void;
  submitLabel?: string;
  bottomPadding?: number;
  fill?: boolean;
  backgroundColor?: string;
  initialIsRecurring?: boolean;
  hideRecurringToggle?: boolean;
  editTask?: Task;
  mode?: 'create' | 'edit';
}

export function CreateTaskContent({
  onSuccess,
  submitLabel,
  bottomPadding: _bottomPadding,
  fill = true,
  backgroundColor = colors.background,
  initialIsRecurring = false,
  hideRecurringToggle = false,
  editTask,
  mode = editTask ? 'edit' : 'create',
}: CreateTaskContentProps) {
  const formState = useCreateTaskFormState(editTask, initialIsRecurring, mode);
  const resolvedSubmitLabel = submitLabel ?? (mode === 'edit' ? 'Save Changes' : 'Create Task');

  const handleSubmit = () => {
    formState.handleSubmit(onSuccess);
  };

  return (
    <View style={[fill ? styles.rootFill : styles.rootAuto, { backgroundColor }]}>
      <CreateTaskForm
        // Form state
        description={formState.description}
        taskCategoryId={formState.taskCategoryId}
        priority={formState.priority}
        dueDate={formState.dueDate}
        isRecurring={formState.isRecurring}
        recurrenceType={formState.recurrenceType}
        recurrenceDays={formState.recurrenceDays}
        outletId={formState.outletId}
        assigneeIds={formState.assigneeIds}
        showDatePicker={formState.showDatePicker}
        showTimePicker={formState.showTimePicker}
        showMonthDaysPicker={formState.showMonthDaysPicker}
        showOutletPicker={formState.showOutletPicker}
        showAssigneePicker={formState.showAssigneePicker}
        // Attachment state
        showAttachmentMenu={formState.showAttachmentMenu}
        attachments={formState.attachments}
        previewAttachmentId={formState.previewAttachmentId}
        activeAudioAttachmentId={formState.activeAudioAttachmentId}
        previewPlayerStatus={formState.previewPlayerStatus}
        isRecordingAudio={formState.isRecordingAudio}
        recordingMillis={formState.recordingMillis}
        recordingBusy={formState.recordingBusy}
        WAVEFORM_BAR_SPECS={formState.WAVEFORM_BAR_SPECS}
        selectedPreviewAttachment={formState.selectedPreviewAttachment}
        // Data
        taskCategories={formState.taskCategories}
        isLoadingTaskCategories={formState.isLoadingTaskCategories}
        isTaskCategoriesError={formState.isTaskCategoriesError}
        isFetchingTaskCategories={formState.isFetchingTaskCategories}
        selectedOutlet={formState.selectedOutlet}
        filteredManagers={formState.filteredManagers}
        selectedManagers={formState.selectedManagers}
        hasTaskCategories={formState.hasTaskCategories}
        hasAssignees={formState.hasAssignees}
        hasPendingAttachmentUploads={formState.hasPendingAttachmentUploads}
        createTask={formState.createTask}
        // Setters / actions
        onDescriptionChange={formState.setDescription}
        onCategoryChange={formState.setTaskCategoryId}
        onPriorityChange={formState.setPriority}
        onDueDateChange={formState.setDueDate}
        onIsRecurringChange={formState.setIsRecurring}
        onRecurrenceTypeChange={(t: 'WEEKLY' | 'MONTHLY') => {
          formState.setRecurrenceType(t);
          formState.setRecurrenceDays([]);
        }}
        onRecurrenceDaysChange={formState.setRecurrenceDays}
        onOutletIdChange={formState.setOutletId}
        onAssigneeIdsChange={formState.setAssigneeIds}
        onOutletSelect={(id: string) => {
          formState.setOutletId(id);
          formState.setShowOutletPicker(false);
        }}
        onAssigneeSelect={(id: string) => {
          formState.setAssigneeIds((prev: string[]) =>
            prev.includes(id) ? prev.filter((x: string) => x !== id) : [...prev, id],
          );
        }}
        onMonthDaySelect={(day: number) => {
          formState.setRecurrenceDays((prev: number[]) =>
            prev.includes(day)
              ? prev.filter((x: number) => x !== day)
              : [...prev, day].sort((a: number, b: number) => a - b),
          );
        }}
        onSubmit={handleSubmit}
        // Modal visibility
        onShowDatePicker={formState.setShowDatePicker}
        onShowTimePicker={formState.setShowTimePicker}
        onShowMonthDaysPicker={formState.setShowMonthDaysPicker}
        onShowOutletPicker={formState.setShowOutletPicker}
        onShowAssigneePicker={formState.setShowAssigneePicker}
        // Attachment actions
        onToggleAttachmentMenu={() => formState.setShowAttachmentMenu((prev: boolean) => !prev)}
        onTakePhoto={() => {
          void formState.takePhoto();
        }}
        onPickImage={() => {
          void formState.pickMedia('image');
        }}
        onPickVideo={() => {
          void formState.pickMedia('video');
        }}
        onPickFile={() => {
          void formState.pickFile();
        }}
        onStartRecording={() => {
          void formState.startAudioRecording();
        }}
        onStopRecording={() => {
          void formState.stopAudioRecording();
        }}
        onDiscardRecording={() => {
          void formState.discardAudioRecording();
        }}
        onAttachmentItemPress={formState.handleAttachmentPress}
        onAttachmentRemove={formState.removeAttachment}
        // Config
        submitLabel={resolvedSubmitLabel}
        hideRecurringToggle={hideRecurringToggle}
        // Close handlers
        onCloseDatePicker={() => formState.setShowDatePicker(false)}
        onCloseTimePicker={() => formState.setShowTimePicker(false)}
        onCloseMonthDaysPicker={() => formState.setShowMonthDaysPicker(false)}
        onCloseOutletPicker={() => formState.setShowOutletPicker(false)}
        onCloseAssigneePicker={() => formState.setShowAssigneePicker(false)}
        // Picker data
        outlets={formState.outlets ?? []}
        // Refetch
        onRefetchCategories={() => {
          void formState.refetchTaskCategories();
        }}
      />
    </View>
  );
}

type Props = NativeStackScreenProps<TasksStackParamList, 'CreateTask'>;

export default function CreateTaskScreen({ navigation }: Props) {
  return (
    <SafeAreaView
      style={[styles.rootFill, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <CreateTaskContent onSuccess={() => navigation.goBack()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootFill: { flex: 1 },
  rootAuto: {},
});
