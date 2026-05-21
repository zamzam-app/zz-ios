import React from 'react';
import { View, Text } from 'react-native';
import {
  getTaskBadgeStyle,
  getTaskBadges,
  taskBadgeStyles,
  type TaskBadgeTask,
} from './taskBadges';

export default function TaskBadgeRow({ task }: { task: TaskBadgeTask }) {
  const badges = getTaskBadges(task);
  if (badges.length === 0) return null;

  return (
    <View style={taskBadgeStyles.row}>
      {badges.map((badge) => {
        const tone = getTaskBadgeStyle(badge.tone);
        return (
          <View
            key={badge.key}
            style={[
              taskBadgeStyles.badge,
              { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor },
            ]}
          >
            <Text style={[taskBadgeStyles.label, { color: tone.textColor }]}>{badge.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
