import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { TaskCategoryOption, TaskPriority } from '../../../api/endpoints/tasks';
import DatePickerModal from '../../../components/shared/DatePickerModal';
import { colors, spacing, radius, typography } from '../../../theme/theme';

import { TaskAttachmentComposer } from './TaskAttachmentComposer';
import { TaskAttachmentPreviewList } from './TaskAttachmentPreviewList';
import { TaskAttachmentViewer } from './TaskAttachmentViewer';
import { TaskPickerSheets } from './TaskPickerSheets';
import { TaskRecurrenceSection } from './TaskRecurrenceSection';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({
  id: String(i + 1),
  name: String(i + 1),
}));

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

interface CreateTaskFormProps {
  // Form state
  description: string;
  taskCategoryId: string | undefined;
  priority: TaskPriority;
  dueDate: Date;
  isRecurring: boolean;
  recurrenceType: 'WEEKLY' | 'MONTHLY';
  recurrenceDays: number[];
  outletId: string;
  assigneeIds: string[];
  showDatePicker: boolean;
  showTimePicker: boolean;
  showMonthDaysPicker: boolean;
  showOutletPicker: boolean;
  showAssigneePicker: boolean;

  // Attachment state
  showAttachmentMenu: boolean;
  attachments: import('../hooks/useTaskAttachmentUploads').AttachmentItem[];
  previewAttachmentId: string | null;
  activeAudioAttachmentId: string | null;
  previewPlayerStatus: {
    playing: boolean;
    currentTime: number;
    duration: number;
    didJustFinish: boolean;
  };
  isRecordingAudio: boolean;
  recordingMillis: number | null;
  recordingBusy: boolean;
  WAVEFORM_BAR_SPECS: { id: string; height: number }[];
  viewerImageUrl: string | null;
  onViewerImageClose: () => void;

  // Data
  taskCategories: TaskCategoryOption[] | undefined;
  isLoadingTaskCategories: boolean;
  isTaskCategoriesError: boolean;
  isFetchingTaskCategories: boolean;
  selectedOutlet: { id: string; name: string } | undefined;
  filteredManagers: { id: string; name: string }[];
  selectedManagers: { id: string; name: string }[];
  hasTaskCategories: boolean;
  hasAssignees: boolean;
  hasPendingAttachmentUploads: boolean;
  createTask: { isPending: boolean };

  // Setters / actions
  onDescriptionChange: (text: string) => void;
  onCategoryChange: (id: string) => void;
  onPriorityChange: (p: TaskPriority) => void;
  onDueDateChange: (date: Date) => void;
  onIsRecurringChange: (v: boolean) => void;
  onRecurrenceTypeChange: (t: 'WEEKLY' | 'MONTHLY') => void;
  onRecurrenceDaysChange: (d: number[]) => void;
  onOutletIdChange: (id: string) => void;
  onAssigneeIdsChange: (ids: string[]) => void;
  onOutletSelect: (id: string) => void;
  onAssigneeSelect: (id: string) => void;
  onMonthDaySelect: (day: number) => void;
  onSubmit: () => void;

  // Modal visibility
  onShowDatePicker: (v: boolean) => void;
  onShowTimePicker: (v: boolean) => void;
  onShowMonthDaysPicker: (v: boolean) => void;
  onShowOutletPicker: (v: boolean) => void;
  onShowAssigneePicker: (v: boolean) => void;

  // Attachment actions
  onToggleAttachmentMenu: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onPickFile: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDiscardRecording: () => void;
  onAttachmentItemPress: (item: import('../hooks/useTaskAttachmentUploads').AttachmentItem) => void;
  onAttachmentRemove: (id: string) => void;

  // Config
  submitLabel: string;
  hideRecurringToggle?: boolean;
  onCloseDatePicker: () => void;
  onCloseTimePicker: () => void;
  onCloseMonthDaysPicker: () => void;
  onCloseOutletPicker: () => void;
  onCloseAssigneePicker: () => void;

  // Data for pickers
  outlets: { id: string; name: string }[];

  // Task categories refetch
  onRefetchCategories: () => void;
}

export function CreateTaskForm({
  description,
  taskCategoryId,
  priority,
  dueDate,
  isRecurring,
  recurrenceType,
  recurrenceDays,
  outletId,
  assigneeIds,
  showDatePicker,
  showTimePicker,
  showMonthDaysPicker,
  showOutletPicker,
  showAssigneePicker,

  showAttachmentMenu,
  attachments,
  previewAttachmentId,
  activeAudioAttachmentId,
  previewPlayerStatus,
  isRecordingAudio,
  recordingMillis,
  recordingBusy,
  WAVEFORM_BAR_SPECS,
  viewerImageUrl,
  onViewerImageClose,

  taskCategories,
  isLoadingTaskCategories,
  isTaskCategoriesError,
  isFetchingTaskCategories,
  selectedOutlet,
  filteredManagers,
  selectedManagers,
  hasTaskCategories,
  hasAssignees,
  hasPendingAttachmentUploads,
  createTask,

  onDescriptionChange,
  onCategoryChange,
  onPriorityChange,
  onDueDateChange,
  onIsRecurringChange,
  onRecurrenceTypeChange,
  onRecurrenceDaysChange,
  onOutletSelect,
  onAssigneeSelect,
  onMonthDaySelect,
  onSubmit,

  onShowDatePicker,
  onShowTimePicker,
  onShowMonthDaysPicker,
  onShowOutletPicker,
  onShowAssigneePicker,

  onToggleAttachmentMenu,
  onTakePhoto,
  onPickImage,
  onPickVideo,
  onPickFile,
  onStartRecording,
  onStopRecording,
  onDiscardRecording,
  onAttachmentItemPress,
  onAttachmentRemove,

  submitLabel,
  hideRecurringToggle,

  onCloseDatePicker,
  onCloseTimePicker,
  onCloseMonthDaysPicker,
  onCloseOutletPicker,
  onCloseAssigneePicker,

  outlets,

  onRefetchCategories,
}: CreateTaskFormProps) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xl }]}
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
          onChangeText={onDescriptionChange}
        />

        <TaskAttachmentComposer
          showAttachmentMenu={showAttachmentMenu}
          isRecordingAudio={isRecordingAudio}
          recordingMillis={recordingMillis}
          recordingBusy={recordingBusy}
          onToggleMenu={onToggleAttachmentMenu}
          onTakePhoto={onTakePhoto}
          onPickImage={onPickImage}
          onPickVideo={onPickVideo}
          onPickFile={onPickFile}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onDiscardRecording={onDiscardRecording}
        />

        <TaskAttachmentPreviewList
          attachments={attachments}
          previewAttachmentId={previewAttachmentId}
          activeAudioAttachmentId={activeAudioAttachmentId}
          previewPlayerStatus={previewPlayerStatus}
          waveBarSpecs={WAVEFORM_BAR_SPECS}
          onItemPress={onAttachmentItemPress}
          onRemove={onAttachmentRemove}
        />

        <TaskAttachmentViewer imageUrl={viewerImageUrl} onClose={onViewerImageClose} />

        <Label text="Category" required />
        {isLoadingTaskCategories ? (
          <View style={styles.fieldState}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : hasTaskCategories ? (
          <CategoryChipGroup
            options={taskCategories ?? []}
            value={taskCategoryId}
            onChange={onCategoryChange}
          />
        ) : isTaskCategoriesError ? (
          <View style={styles.fieldState}>
            <Text style={styles.fieldError}>Unable to load task categories. Please try again.</Text>
            <TouchableOpacity
              style={[styles.retryBtn, isFetchingTaskCategories && styles.retryBtnDisabled]}
              onPress={onRefetchCategories}
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
        <ChipGroup options={PRIORITIES} value={priority} onChange={onPriorityChange} />

        <Label text="Due Date" required />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            style={[styles.input, { flex: 1 }]}
            onPress={() => onShowDatePicker(true)}
          >
            <Text style={styles.inputValue}>
              {dueDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.input, { flex: 1 }]}
            onPress={() => onShowTimePicker(true)}
          >
            <Text style={styles.inputValue}>
              {dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </View>

        <TaskRecurrenceSection
          isRecurring={isRecurring}
          hideRecurringToggle={hideRecurringToggle}
          recurrenceType={recurrenceType}
          recurrenceDays={recurrenceDays}
          onRecurringChange={onIsRecurringChange}
          onTypeChange={onRecurrenceTypeChange}
          onDaysChange={onRecurrenceDaysChange}
          onShowMonthDaysPicker={() => onShowMonthDaysPicker(true)}
        />

        <Label text="Outlet" />
        <TouchableOpacity style={styles.input} onPress={() => onShowOutletPicker(true)}>
          <Text style={{ color: selectedOutlet ? colors.text : colors.textDisabled }}>
            {selectedOutlet?.name ?? 'Select outlet...'}
          </Text>
        </TouchableOpacity>

        <Label text="Assignees" required />
        <TouchableOpacity style={styles.input} onPress={() => onShowAssigneePicker(true)}>
          <Text
            style={{
              color: selectedManagers.length > 0 ? colors.text : colors.textDisabled,
            }}
          >
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
            (createTask.isPending ||
              isLoadingTaskCategories ||
              !hasTaskCategories ||
              !hasAssignees ||
              hasPendingAttachmentUploads) &&
              styles.submitBtnDisabled,
          ]}
          onPress={onSubmit}
          disabled={
            createTask.isPending ||
            isLoadingTaskCategories ||
            !hasTaskCategories ||
            !hasAssignees ||
            hasPendingAttachmentUploads
          }
        >
          {createTask.isPending ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitBtnText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        value={dueDate}
        minimumDate={new Date()}
        onClose={onCloseDatePicker}
        onChange={onDueDateChange}
      />

      <DatePickerModal
        visible={showTimePicker}
        value={dueDate}
        mode="time"
        onClose={onCloseTimePicker}
        onChange={onDueDateChange}
      />

      <TaskPickerSheets
        showOutletPicker={showOutletPicker}
        showMonthDaysPicker={showMonthDaysPicker}
        showAssigneePicker={showAssigneePicker}
        outlets={outlets}
        monthDays={MONTH_DAYS}
        filteredManagers={filteredManagers}
        outletId={outletId}
        assigneeIds={assigneeIds}
        recurrenceDays={recurrenceDays}
        onOutletSelect={onOutletSelect}
        onMonthDaySelect={onMonthDaySelect}
        onAssigneeSelect={onAssigneeSelect}
        onCloseOutletPicker={onCloseOutletPicker}
        onCloseMonthDaysPicker={onCloseMonthDaysPicker}
        onCloseAssigneePicker={onCloseAssigneePicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  submitBtnText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
});
