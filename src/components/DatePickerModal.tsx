import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors, spacing, radius, typography, shadow } from '../theme/theme';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

export default function DatePickerModal({
  visible,
  value,
  onClose,
  onChange,
  minimumDate,
}: DatePickerModalProps) {
  const [tempDate, setTempDate] = useState(value);

  useEffect(() => {
    if (visible) {
      setTempDate(value);
    }
  }, [visible, value]);

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    onChange(tempDate);
    onClose();
  };

  if (Platform.OS !== 'ios') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="default"
        minimumDate={minimumDate}
        onChange={(event, date) => {
          if (event.type === 'set' && date) {
            onChange(date);
          }
          onClose();
        }}
      />
    );
  }

  // Formatting for the header
  const year = tempDate.getFullYear();
  const formattedDate = tempDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.scrim}
          onPress={onClose}
        />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerYear}>{year}</Text>
            <Text style={styles.headerDate}>{formattedDate}</Text>
          </View>

          {/* Body (Calendar) */}
          <View style={styles.body}>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="inline"
              minimumDate={minimumDate}
              onChange={handleDateChange}
              themeVariant="light"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleConfirm}>
              <Text style={[styles.buttonText, { color: colors.primary }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.md,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    paddingVertical: spacing.lg,
  },
  headerYear: {
    fontSize: typography.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: typography.medium,
    textTransform: 'uppercase',
  },
  headerDate: {
    fontSize: typography.xl,
    color: colors.textInverse,
    fontWeight: typography.bold,
    marginTop: 4,
  },
  body: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.textSecondary,
  },
});
