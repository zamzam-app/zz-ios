import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { Task } from '../../../api/endpoints/tasks';
import UnreadBadge from '../../../components/shared/UnreadBadge';
import { colors, spacing, radius, typography } from '../../../theme/theme';
import {
  getTaskAttachmentUrls,
  formatRelativeTime,
  formatDate,
  AttachmentType,
} from '../hooks/useTasksBoardState';
import { buildTaskCardFooterModel } from '../taskAssignedTime';
import { buildTaskBarModel } from '../taskBadges';
import { getTaskCategoryName, getTaskOutletName } from '../taskDisplay';

interface CompletedTaskCardProps {
  task: Task;
  onPress: () => void;
  onOpenAttachment: (task: Task, type: AttachmentType) => void;
  hasUnread: boolean;
}

function CompletedTaskCard({ task, onPress, onOpenAttachment, hasUnread }: CompletedTaskCardProps) {
  const outletName = getTaskOutletName(task);
  const categoryName = getTaskCategoryName(task);
  const taskBar = buildTaskBarModel(task);
  const imageCount = getTaskAttachmentUrls(task, 'images').length;
  const videoCount = getTaskAttachmentUrls(task, 'videos').length;
  const audioCount = getTaskAttachmentUrls(task, 'audios').length;
  const fileCount = getTaskAttachmentUrls(task, 'files').length;
  const footerModel = buildTaskCardFooterModel(task);

  return (
    <TouchableOpacity
      style={[styles.completedCard, !hasUnread && styles.viewedCard]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={styles.openCardTopRow}>
        {hasUnread && (
          <View style={styles.unreadDotWrap}>
            <UnreadBadge count={1} dotOnly />
          </View>
        )}
        <View style={styles.openCardPill}>
          <Text style={styles.openCardPillText}>{categoryName || 'Task'}</Text>
        </View>
        {outletName ? (
          <Text style={styles.openCardOutletName} numberOfLines={1}>
            {outletName}
          </Text>
        ) : null}
      </View>
      <Text style={styles.completedWhen}>{formatRelativeTime(task.completedAt)}</Text>

      <Text style={styles.openTitle} numberOfLines={2}>
        {taskBar.title}
      </Text>
      <Text style={styles.openMetaLine} numberOfLines={1}>
        <Text style={styles.openMetaLabel}>Assigned to: </Text>
        <Text style={styles.openMetaStrong}>{taskBar.assigneeLabel}</Text>
      </Text>
      <Text style={styles.openMetaLine} numberOfLines={1}>
        <Text style={styles.openMetaLabel}>Due: </Text>
        <Text style={styles.openMetaStrong}>{formatDate(task.dueDate, task.dueTime)}</Text>
      </Text>

      <View style={styles.openCardDivider} />

      <View style={styles.openCardFooter}>
        <View style={styles.openCardAttachmentActions}>
          <TouchableOpacity
            style={styles.openCardIconBtn}
            onPress={() => onOpenAttachment(task, 'images')}
          >
            <Ionicons name="camera-outline" size={15} color={colors.textSecondary} />
            {imageCount > 0 ? <Text style={styles.openCardIconCount}>{imageCount}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.openCardIconBtn}
            onPress={() => onOpenAttachment(task, 'videos')}
          >
            <Ionicons name="videocam-outline" size={15} color={colors.textSecondary} />
            {videoCount > 0 ? <Text style={styles.openCardIconCount}>{videoCount}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.openCardIconBtn}
            onPress={() => onOpenAttachment(task, 'files')}
          >
            <Ionicons name="document-outline" size={15} color={colors.textSecondary} />
            {fileCount > 0 ? <Text style={styles.openCardIconCount}>{fileCount}</Text> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.openCardIconBtn}
            onPress={() => onOpenAttachment(task, 'audios')}
          >
            <Ionicons name="mic-outline" size={15} color={colors.textSecondary} />
            {audioCount > 0 ? <Text style={styles.openCardIconCount}>{audioCount}</Text> : null}
          </TouchableOpacity>
        </View>
        {footerModel.assignedTimeLabel ? (
          <Text style={styles.openCardAssignedTime} numberOfLines={1}>
            {footerModel.assignedTimeLabel}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

interface CompletedTasksAccordionProps {
  tasks: Task[];
  isExpanded: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  unreadSet: Set<string>;
  onToggle: () => void;
  onLoadMore: () => void;
  onTaskPress: (taskId: string) => void;
  onOpenAttachment: (task: Task, type: AttachmentType) => void;
  totalCount: number;
}

export function CompletedTasksAccordion({
  tasks,
  isExpanded,
  hasNextPage,
  isFetchingNextPage,
  unreadSet,
  onToggle,
  onLoadMore,
  onTaskPress,
  onOpenAttachment,
  totalCount,
}: CompletedTasksAccordionProps) {
  return (
    <View style={[styles.accordionContainer, isExpanded && styles.accordionContainerExpanded]}>
      <TouchableOpacity
        style={styles.completedAccordionToggle}
        onPress={onToggle}
        activeOpacity={0.9}
      >
        <View style={styles.accordionHeaderLeft}>
          <View
            style={[styles.sectionDot, styles.sectionDotCompleted, { marginRight: spacing.sm }]}
          />
          <Text style={styles.accordionTitle}>Completed Tasks</Text>
          <View style={styles.accordionCountBadge}>
            <Text style={styles.accordionCountText}>{totalCount}</Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-up'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.accordionContentHorizontal}>
          <FlatList
            horizontal
            data={tasks}
            keyExtractor={(task) => task.id}
            contentContainerStyle={styles.completedRow}
            showsHorizontalScrollIndicator={false}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                onLoadMore();
              }
            }}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => (
              <CompletedTaskCard
                task={item}
                onPress={() => onTaskPress(item.id)}
                onOpenAttachment={onOpenAttachment}
                hasUnread={unreadSet.has(item.id)}
              />
            )}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.completedLoadingMoreWrap}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  completedRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingRight: spacing.md,
  },
  completedCard: {
    width: 280,
    backgroundColor: colors.uiGray3,
    borderRadius: radius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha17,
    gap: spacing.xs,
    marginRight: spacing.sm,
    alignSelf: 'flex-start',
  },
  completedWhen: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  openCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  unreadDotWrap: {
    marginRight: 4,
    marginTop: 2,
  },
  openCardPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openCardPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  openMetaLabel: {
    fontSize: typography.sm,
    color: colors.accentSteel,
    fontWeight: typography.semibold,
  },
  openMetaStrong: {
    color: colors.text,
    fontWeight: typography.bold,
  },
  openMetaLine: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  openCardDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorderAlpha33,
    marginVertical: spacing.xs,
  },
  openCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  openCardAttachmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  openCardIconBtn: {
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  openCardIconCount: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
  },
  openCardAssignedTime: {
    marginLeft: spacing.sm,
    flexShrink: 1,
    textAlign: 'right',
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  viewedCard: {
    opacity: 0.75,
  },
  accordionContainer: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  accordionContainerExpanded: {},
  completedAccordionToggle: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  accordionContentHorizontal: {
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accordionTitle: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  accordionCountBadge: {
    backgroundColor: colors.uiGray3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  accordionCountText: {
    fontSize: typography.xs,
    fontWeight: typography.bold,
    color: colors.textSecondary,
  },
  completedLoadingMoreWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accentYellow,
  },
  sectionDotCompleted: { backgroundColor: colors.textSecondary },
});
