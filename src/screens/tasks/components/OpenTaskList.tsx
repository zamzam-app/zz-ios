import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { Task } from '../../../api/endpoints/tasks';
import { colors, spacing, radius, typography } from '../../../theme/theme';
import { formatDueDisplay } from '../hooks/useTasksBoardState';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from '../taskDisplay';

interface OpenTaskCardProps {
  task: Task;
  onPress: () => void;
  hasUnread: boolean;
}

function OpenTaskCard({ task, onPress, hasUnread }: OpenTaskCardProps) {
  const outletName = getTaskOutletName(task);
  const categoryName = getTaskCategoryName(task);
  const assigneeNames = getTaskAssigneeNames(task);

  const upperCategory = (categoryName || '').toUpperCase();
  const priority = task.priority;

  let chipBg = colors.uiSlate200;
  let chipText = colors.uiSlate600;
  let chipLabel = categoryName || 'Task';

  if (priority === 'HIGH' || upperCategory.includes('HIGH')) {
    chipBg = colors.errorLight;
    chipText = colors.error;
    chipLabel = 'HIGH PRIORITY';
  } else if (
    priority === 'MEDIUM' ||
    upperCategory.includes('ROUTINE') ||
    upperCategory.includes('MEDIUM')
  ) {
    chipBg = colors.infoLight;
    chipText = colors.info;
    chipLabel = categoryName || 'ROUTINE';
  } else if (
    priority === 'LOW' ||
    upperCategory.includes('VENDOR') ||
    upperCategory.includes('LOW')
  ) {
    chipBg = colors.warningLight;
    chipText = colors.primary;
    chipLabel = categoryName || 'VENDOR';
  }

  const titleText = task.title || 'Task';
  let descText = '';
  const descLines = (task.description || '').split('\n');
  if (descLines.length > 1) {
    descText = descLines.slice(1).join('\n').trim();
  } else if (task.description !== task.title) {
    descText = task.description;
  }

  const names = assigneeNames;

  return (
    <TouchableOpacity
      style={[styles.openCard, hasUnread ? styles.unreadCard : styles.readCard]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.openCardTopRow}>
        <View style={styles.topRowLeft}>
          {hasUnread && <View style={styles.unreadDot} />}
          <View
            style={[
              styles.openCardPill,
              { backgroundColor: chipBg, borderColor: colors.transparent },
            ]}
          >
            <Text style={[styles.openCardPillText, { color: chipText }]}>{chipLabel}</Text>
          </View>
          <Text style={styles.openCardDueText}>{formatDueDisplay(task.dueDate, task.dueTime)}</Text>
        </View>
        {outletName ? (
          <Text style={styles.openCardOutletName} numberOfLines={1}>
            {outletName}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.openTitle, !hasUnread && styles.viewedTitle]} numberOfLines={2}>
        {titleText}
      </Text>

      {descText ? (
        <Text
          style={[styles.openDescription, !hasUnread && styles.viewedDescription]}
          numberOfLines={3}
        >
          {descText}
        </Text>
      ) : null}

      <View style={styles.assigneeRow}>
        <Text style={styles.assigneeText}>
          <Text style={styles.assigneeLabel}>Assigned to: </Text>
          <Text style={styles.assigneeStrong}>
            {names.length > 0 ? names.join(', ') : 'Unassigned'}
          </Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

interface OpenTaskListProps {
  tasks: Task[];
  isLoading: boolean;
  isFetching: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  unreadSet: Set<string>;
  onRefresh: () => void;
  onLoadMore: () => void;
  onTaskPress: (taskId: string) => void;
  emptyMessage: string;
}

export function OpenTaskList({
  tasks,
  isLoading,
  isFetching,
  hasNextPage,
  isFetchingNextPage,
  unreadSet,
  onRefresh,
  onLoadMore,
  onTaskPress,
  emptyMessage,
}: OpenTaskListProps) {
  return (
    <View style={styles.openListShell}>
      <FlatList
        style={styles.openList}
        data={tasks}
        keyExtractor={(task) => task.id}
        contentContainerStyle={
          tasks.length > 0 ? styles.openListContent : styles.openListEmptyContent
        }
        showsVerticalScrollIndicator
        persistentScrollbar
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            onLoadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        renderItem={({ item }) => (
          <View style={styles.openCardWrap}>
            <OpenTaskCard
              task={item}
              onPress={() => onTaskPress(item.id)}
              hasUnread={unreadSet.has(item.id)}
            />
          </View>
        )}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.loadingMoreWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.empty}>{emptyMessage}</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  openListShell: { flex: 1, minHeight: 0, position: 'relative' },
  openList: { flex: 1, minHeight: 0 },
  openListContent: { paddingBottom: spacing.sm },
  openListEmptyContent: { flexGrow: 1, justifyContent: 'center' },
  openCardWrap: { marginBottom: spacing.sm },
  openCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  unreadCard: {
    backgroundColor: colors.surface,
    borderColor: colors.uiSlate200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  readCard: {
    backgroundColor: colors.uiGray0,
    borderColor: colors.uiSlate200,
    elevation: 0,
  },
  topRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentBlue,
    marginRight: 4,
  },
  openCardPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  openCardPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  openCardDueText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  openCardOutletName: {
    flex: 1,
    textAlign: 'right',
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  openTitle: {
    fontSize: typography.lg,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  openDescription: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '400',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  assigneeText: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  assigneeLabel: {
    color: colors.textSecondary,
  },
  assigneeStrong: {
    fontWeight: '600',
    color: colors.text,
  },
  viewedTitle: {
    color: colors.accentCharcoalAlpha,
    fontWeight: '400',
  },
  viewedDescription: {
    color: colors.uiSlate400,
    fontWeight: '400',
  },
  loadingWrap: { paddingVertical: spacing.xl, alignItems: 'center' },
  loadingMoreWrap: { paddingVertical: spacing.sm, alignItems: 'center' },
  emptyWrap: { paddingVertical: spacing.xl },
  empty: { textAlign: 'center', color: colors.textSecondary, fontSize: typography.sm },
});
