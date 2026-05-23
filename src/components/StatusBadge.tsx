import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { TaskStatus } from '../api/endpoints/tasks';
import { colors, typography, radius } from '../theme/theme';

interface StatusBadgeConfig {
  label: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
}

const STATUS_CONFIG: Record<string, StatusBadgeConfig> = {
  OPEN: {
    label: 'Open',
    color: colors.statusOpen,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  COMPLETED: {
    label: 'Completed',
    color: colors.statusCompleted,
    backgroundColor: '#ECFDF3',
    borderColor: '#D1FAE5',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: colors.info,
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
};

function toStatusLabel(status: string) {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function StatusBadge({ status }: { status: TaskStatus | string }) {
  const normalizedStatus = status.trim().replace(/[\s-]/g, '_').toUpperCase();
  const cfg = STATUS_CONFIG[normalizedStatus] ?? {
    label: toStatusLabel(normalizedStatus),
    color: colors.textSecondary,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  };

  return (
    <View
      style={[styles.badge, { backgroundColor: cfg.backgroundColor, borderColor: cfg.borderColor }]}
    >
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
