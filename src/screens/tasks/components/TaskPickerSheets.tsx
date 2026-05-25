import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../../theme/theme';

interface PickerItem {
  id: string;
  name: string;
}

interface TaskPickerSheetsProps {
  showOutletPicker: boolean;
  showMonthDaysPicker: boolean;
  showAssigneePicker: boolean;
  outlets: PickerItem[];
  monthDays: PickerItem[];
  filteredManagers: PickerItem[];
  outletId: string;
  assigneeIds: string[];
  recurrenceDays: number[];
  onOutletSelect: (id: string) => void;
  onMonthDaySelect: (day: number) => void;
  onAssigneeSelect: (id: string) => void;
  onCloseOutletPicker: () => void;
  onCloseMonthDaysPicker: () => void;
  onCloseAssigneePicker: () => void;
}

function PickerModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
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

export function TaskPickerSheets({
  showOutletPicker,
  showMonthDaysPicker,
  showAssigneePicker,
  outlets,
  monthDays,
  filteredManagers,
  outletId,
  assigneeIds,
  recurrenceDays,
  onOutletSelect,
  onMonthDaySelect,
  onAssigneeSelect,
  onCloseOutletPicker,
  onCloseMonthDaysPicker,
  onCloseAssigneePicker,
}: TaskPickerSheetsProps) {
  return (
    <>
      <PickerModal
        visible={showOutletPicker}
        title="Select Outlet"
        items={outlets}
        selected={outletId}
        onSelect={(id) => {
          onOutletSelect(id);
          onCloseOutletPicker();
        }}
        onClose={onCloseOutletPicker}
      />

      <PickerModal
        visible={showMonthDaysPicker}
        title="Select Days of the Month"
        items={monthDays}
        selected={recurrenceDays.map(String)}
        multi
        onSelect={(id) => {
          onMonthDaySelect(Number(id));
        }}
        onClose={onCloseMonthDaysPicker}
      />

      <PickerModal
        visible={showAssigneePicker}
        title="Select Assignees"
        items={filteredManagers}
        selected={assigneeIds}
        multi
        onSelect={(id) => {
          onAssigneeSelect(id);
        }}
        onClose={onCloseAssigneePicker}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
