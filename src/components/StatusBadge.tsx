import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radius } from '../theme/theme';
import { TaskStatus } from '../api/endpoints/tasks';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  OPEN: { label: 'Open', color: colors.statusOpen },
  ASSIGNED: { label: 'Assigned', color: colors.statusAssigned },
  IN_PROGRESS: { label: 'In Progress', color: colors.statusInProgress },
  READY_FOR_REVIEW: { label: 'Review', color: colors.statusReadyForReview },
  COMPLETED: { label: 'Completed', color: colors.statusCompleted },
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: colors.textSecondary };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '44' }]}>
      <Text style={[styles.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.xs,
    fontWeight: '600',
  },
});
