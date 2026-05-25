import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';
import type { AttachmentPreview, SerializedTimelineEvent } from '../../../types/task';
import { TimelineEventCard, TimelineSkeleton } from '../components/timeline';

interface TaskActivityTimelineProps {
  filteredEvents: SerializedTimelineEvent[];
  timelineQuery: {
    data: unknown;
    isLoading: boolean;
    isError: boolean;
    isRefetching: boolean;
    isFetchingNextPage: boolean;
    hasNextPage: boolean;
    refetch: () => void;
    fetchNextPage: () => void;
  };
  isLoading: boolean;
  handleRefresh: () => void;
  handleLoadMore: () => void;
  onAttachmentPress: (attachment: AttachmentPreview) => void;
  onActorPress: (userId: string) => void;
}

export function TaskActivityTimeline({
  filteredEvents,
  timelineQuery,
  isLoading,
  handleRefresh,
  handleLoadMore,
  onAttachmentPress,
  onActorPress,
}: TaskActivityTimelineProps) {
  const renderEvent = useCallback(
    ({ item, index }: { item: SerializedTimelineEvent; index: number }) => (
      <TimelineEventCard
        event={item}
        isLast={index === filteredEvents.length - 1}
        onAttachmentPress={onAttachmentPress}
        onActorPress={onActorPress}
      />
    ),
    [filteredEvents, onAttachmentPress, onActorPress],
  );

  const keyExtractor = useCallback(
    (item: SerializedTimelineEvent, index: number) =>
      `${item.sortKey}:${item._id || 'no-id'}:${index}`,
    [],
  );

  return (
    <FlashList
      style={styles.timelineList}
      contentContainerStyle={styles.timelineContent}
      data={filteredEvents}
      keyExtractor={keyExtractor}
      renderItem={renderEvent}
      ListFooterComponent={
        timelineQuery.isFetchingNextPage ? (
          <View style={styles.loadingMoreWrap}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingMoreText}>Loading more events...</Text>
          </View>
        ) : !timelineQuery.hasNextPage && filteredEvents.length > 0 ? (
          <View style={styles.endOfTimeline}>
            <View style={styles.endDot} />
            <Text style={styles.endText}>You&apos;ve seen everything</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        !timelineQuery.isLoading ? (
          <View style={styles.emptyTimeline}>
            <Ionicons name="time-outline" size={32} color={colors.textDisabled} />
            <Text style={styles.emptyTimelineText}>
              {timelineQuery.isError ? 'Failed to load activity' : 'No activity yet'}
            </Text>
            <Text style={styles.emptyTimelineSubtext}>
              {timelineQuery.isError
                ? 'Pull down to try again'
                : 'Events will appear here as the task is updated'}
            </Text>
            {timelineQuery.isError && (
              <TouchableOpacity
                style={styles.retryBtnSmall}
                onPress={() => timelineQuery.refetch()}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={14} color={colors.primary} />
                <Text style={styles.retryBtnSmallText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : timelineQuery.isLoading && !isLoading ? (
          <TimelineSkeleton />
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={timelineQuery.isRefetching && !timelineQuery.isLoading}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator
      persistentScrollbar
    />
  );
}

const styles = StyleSheet.create({
  timelineList: { flex: 1 },
  timelineContent: { paddingBottom: spacing.md },
  loadingMoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  loadingMoreText: { fontSize: typography.xs, color: colors.textSecondary },
  endOfTimeline: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  endDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textDisabled },
  endText: { fontSize: typography.xs, color: colors.textDisabled },
  emptyTimeline: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  emptyTimelineText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyTimelineSubtext: {
    fontSize: typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
  },
  retryBtnSmall: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  retryBtnSmallText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: '700',
  },
});
