import React, { useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCreateTask, useTaskCategories } from '../../hooks/useTasks';
import { useOutlets } from '../../hooks/useOutlets';
import { useManagers } from '../../hooks/useUsers';
import { TaskPriority, TaskCategoryOption } from '../../api/endpoints/tasks';
import { colors, spacing, radius, typography } from '../../theme/theme';
import { TasksStackParamList } from '../../navigation/TasksNavigator';

type Props = NativeStackScreenProps<TasksStackParamList, 'CreateTask'>;

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

function getApiErrorMessage(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data;

  if (typeof responseData === 'string' && responseData.trim().length > 0) {
    return responseData;
  }

  if (responseData && typeof responseData === 'object') {
    const message = (responseData as { message?: unknown }).message;
    if (Array.isArray(message)) {
      const firstMessage = message.find(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      );
      if (firstMessage) return firstMessage;
    }
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }

    const errorText = (responseData as { error?: unknown }).error;
    if (typeof errorText === 'string' && errorText.trim().length > 0) {
      return errorText;
    }
  }

  const genericMessage = (error as { message?: unknown })?.message;
  if (typeof genericMessage === 'string' && genericMessage.trim().length > 0) {
    return genericMessage;
  }

  return fallback;
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {text}{required && <Text style={{ color: colors.error }}> *</Text>}
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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: typography.base }}>Done</Text>
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
                {isSelected && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function CreateTaskScreen({ navigation }: Props) {
  const [description, setDescription] = useState('');
  const [taskCategoryId, setTaskCategoryId] = useState<string | undefined>();
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [outletId, setOutletId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  const { data: outlets } = useOutlets();
  const { data: managers } = useManagers();
  const { data: taskCategories, isLoading: isLoadingTaskCategories } = useTaskCategories();
  const createTask = useCreateTask();

  const selectedOutlet = outlets?.find((o) => o.id === outletId);
  const selectedManagers = managers?.filter((m) => assigneeIds.includes(m.id)) ?? [];
  const hasTaskCategories = (taskCategories?.length ?? 0) > 0;

  const handleSubmit = () => {
    if (!description.trim()) return Alert.alert('Required', 'Please enter a description.');
    if (!taskCategoryId) return Alert.alert('Required', 'Please select a category.');

    createTask.mutate(
      {
        description: description.trim(),
        taskCategoryId,
        priority,
        dueDate: dueDate.toISOString(),
        ...(outletId ? { outletId } : {}),
        ...(assigneeIds.length > 0 ? { assigneeIds } : {}),
      },
      {
        onSuccess: () => navigation.goBack(),
        onError: (error) =>
          Alert.alert('Error', getApiErrorMessage(error, 'Failed to create task. Please try again.')),
      },
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
        ) : (
          <Text style={styles.fieldError}>
            Unable to load task categories. Please try again.
          </Text>
        )}

        <Label text="Priority" />
        <ChipGroup options={PRIORITIES} value={priority} onChange={setPriority} />

        <Label text="Due Date" required />
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: colors.text }}>
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

        <Label text="Assignees" />
        <TouchableOpacity style={styles.input} onPress={() => setShowAssigneePicker(true)}>
          <Text style={{ color: selectedManagers.length > 0 ? colors.text : colors.textDisabled }}>
            {selectedManagers.length > 0 ? selectedManagers.map((m) => m.name).join(', ') : 'Select managers (optional)...'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (createTask.isPending || isLoadingTaskCategories || !hasTaskCategories) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={createTask.isPending || isLoadingTaskCategories || !hasTaskCategories}
        >
          {createTask.isPending ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.submitBtnText}>Create Task</Text>
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
        items={managers ?? []}
        selected={assigneeIds}
        multi
        onSelect={(id) => {
          setAssigneeIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          );
        }}
        onClose={() => setShowAssigneePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },

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
  },
  fieldError: { color: colors.error, fontSize: typography.sm },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
});
