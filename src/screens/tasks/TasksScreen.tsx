import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tasksApi } from '../../api/endpoints/tasks';
import { TASK_METRIC_FILTER_LABELS } from '../../constants/taskFilters';
import { useRemoveAttachment } from '../../hooks/tasks';
import { colors, spacing, radius, typography } from '../../theme/theme';

import {
  TaskBoardHeader,
  TaskFiltersToolbar,
  TaskFilterSheet,
  OpenTaskList,
  CompletedTasksAccordion,
  TaskAttachmentsSheet,
} from './components';
import { CreateTaskContent } from './CreateTaskScreen';
import { useTasksBoardState } from './hooks/useTasksBoardState';

export default function TasksScreen() {
  const {
    // User / nav
    isAdmin,
    isManager,
    navigation,

    // Tab
    activeTab,
    setActiveTab,

    // Filters
    activeFilter,
    setActiveFilter,
    priorityFilter,
    setPriorityFilter,
    dueDateFilter,
    setDueDateFilter,
    metricFilter,
    setMetricFilter,
    searchQuery,
    setSearchQuery,

    // Filter modal
    showFilterModal,
    setShowFilterModal,
    activeFilterSection,
    setActiveFilterSection,
    showDueDatePicker,
    setShowDueDatePicker,

    // Create / accordion / attachment
    showCreateModal,
    setShowCreateModal,
    showCompletedAccordion,
    setShowCompletedAccordion,
    attachmentModal,
    setAttachmentModal,

    // Counts
    todayCount,
    highPriorityCount,

    // Queries & derived data
    openTasksQuery,
    completedTasksQuery,
    openTasks,
    completedTasks,
    openTasksTotal,
    completedTasksTotal,
    isLoading,
    isFetching,
    showOpenSection,
    showCompletedSection,

    // Unread
    unreadIds,
    unreadSet,

    // Computed
    formatFilterDate,

    // Actions
    openAttachmentModal,
    openExternalAttachment,
    refetch,
  } = useTasksBoardState();

  const removeAttachmentMutation = useRemoveAttachment();
  const attachmentIdMapRef = useRef<Map<string, string>>(new Map());

  // Fetch attachment IDs from the backend when the modal opens
  // so we can pass real MongoDB ObjectIds to removeAttachment
  useEffect(() => {
    if (!attachmentModal) {
      attachmentIdMapRef.current = new Map();
      return;
    }
    const taskId = attachmentModal.task.id;
    if (!taskId) return;
    let ignore = false;
    tasksApi
      .getAttachments(taskId, { limit: 100 })
      .then((response) => {
        if (ignore) return;
        const map = new Map<string, string>();
        for (const att of response.data) {
          if (att.url) {
            map.set(att.url, att._id);
          }
        }
        attachmentIdMapRef.current = map;
      })
      .catch(() => {
        // Silently fail — delete button will show a useful error
      });
    return () => {
      ignore = true;
    };
  }, [attachmentModal]);

  const handleRemoveAttachment = useCallback(
    (url: string) => {
      if (!attachmentModal) return;
      const taskId = attachmentModal.task.id;
      if (!taskId) {
        Alert.alert('Error', 'Could not identify the task for this attachment.');
        return;
      }
      const realId = attachmentIdMapRef.current.get(url);
      if (!realId) {
        Alert.alert(
          'Delete Failed',
          'Could not identify this attachment. Please close and reopen the attachment list and try again.',
        );
        return;
      }
      removeAttachmentMutation.mutate(
        { taskId, attachmentId: realId },
        {
          onSuccess: () => {
            void refetch();
          },
          onError: () => {
            Alert.alert('Delete Failed', 'Could not remove this attachment. Please try again.');
          },
        },
      );
    },
    [attachmentModal, removeAttachmentMutation, refetch],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TaskBoardHeader
        isAdmin={isAdmin}
        isManager={isManager}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNavigateToCategories={() => navigation.navigate('TaskCategories')}
        onCreatePress={() => setShowCreateModal(true)}
      />

      <TaskFiltersToolbar
        activeFilter={activeFilter}
        priorityFilter={priorityFilter}
        dueDateFilter={dueDateFilter}
        metricFilter={metricFilter}
        todayCount={todayCount}
        highPriorityCount={highPriorityCount}
        unreadCount={unreadIds.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterPress={() => setShowFilterModal(true)}
        onFilterChipPress={(key) => setActiveFilter(activeFilter === key ? 'ALL' : key)}
      />

      {metricFilter !== 'all' && (
        <View style={styles.metricFilterChipRow}>
          <View style={styles.metricFilterChip}>
            <Text style={styles.metricFilterChipText}>
              {`Filtered: ${TASK_METRIC_FILTER_LABELS[metricFilter]}`}
            </Text>
            <TouchableOpacity
              onPress={() => setMetricFilter('all')}
              style={styles.metricFilterChipClear}
            >
              <Text style={styles.metricFilterChipClearText}>x</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {dueDateFilter && (
        <View style={styles.metricFilterChipRow}>
          <View style={styles.metricFilterChip}>
            <Text style={styles.metricFilterChipText}>
              {`Due: ${formatFilterDate(dueDateFilter)}`}
            </Text>
            <TouchableOpacity
              onPress={() => setDueDateFilter(null)}
              style={styles.metricFilterChipClear}
            >
              <Text style={styles.metricFilterChipClearText}>x</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.sectionsContainer}>
        {showOpenSection && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeadingWrap}>
                <View style={styles.sectionDot} />
                <Text style={styles.sectionTitle}>Open Tasks</Text>
              </View>
              <Text style={styles.sectionCount}>{openTasksTotal} active</Text>
            </View>

            <OpenTaskList
              tasks={openTasks}
              isLoading={isLoading}
              isFetching={isFetching}
              hasNextPage={openTasksQuery.hasNextPage ?? false}
              isFetchingNextPage={openTasksQuery.isFetchingNextPage ?? false}
              unreadSet={unreadSet}
              onRefresh={refetch}
              onLoadMore={() => {
                if (openTasksQuery.hasNextPage) {
                  void openTasksQuery.fetchNextPage();
                }
              }}
              onTaskPress={(taskId) => navigation.navigate('TaskDetail', { taskId })}
              emptyMessage={isManager ? 'No open tasks found for you' : 'No open tasks found'}
            />
          </>
        )}
      </View>

      <TaskFilterSheet
        visible={showFilterModal}
        priorityFilter={priorityFilter}
        dueDateFilter={dueDateFilter}
        activeFilterSection={activeFilterSection}
        showDueDatePicker={showDueDatePicker}
        onClose={() => {
          setShowFilterModal(false);
          setShowDueDatePicker(false);
        }}
        onPriorityChange={setPriorityFilter}
        onDueDateChange={(date) => setDueDateFilter(date)}
        onClearDueDate={() => setDueDateFilter(null)}
        onClearFilters={() => {
          setPriorityFilter('ALL');
          setDueDateFilter(null);
          setShowDueDatePicker(false);
          setActiveFilterSection('priority');
        }}
        onFilterSectionChange={setActiveFilterSection}
        onShowDueDatePicker={setShowDueDatePicker}
      />

      {showCreateModal && (
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.createModalRoot}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.createModalScrim}
              onPress={() => setShowCreateModal(false)}
            />
            <View style={styles.createSheet}>
              <View style={styles.createSheetTop}>
                <View style={styles.createSheetHandle} />
                <View style={styles.createSheetHeader}>
                  <Text style={styles.createSheetTitle}>Assign New Task</Text>
                  <TouchableOpacity
                    style={styles.createSheetClose}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <CreateTaskContent
                mode="create"
                onSuccess={() => {
                  setShowCreateModal(false);
                  void refetch();
                }}
                initialIsRecurring={activeTab === 'RECURRING'}
                hideRecurringToggle
                bottomPadding={24}
                fill
                backgroundColor={colors.surface}
              />
            </View>
          </View>
        </Modal>
      )}

      <TaskAttachmentsSheet
        visible={Boolean(attachmentModal)}
        attachmentModal={attachmentModal}
        onClose={() => setAttachmentModal(null)}
        onOpenExternal={openExternalAttachment}
        onRemove={handleRemoveAttachment}
      />

      {showCompletedSection && (
        <CompletedTasksAccordion
          tasks={completedTasks}
          isExpanded={showCompletedAccordion}
          hasNextPage={completedTasksQuery.hasNextPage ?? false}
          isFetchingNextPage={completedTasksQuery.isFetchingNextPage ?? false}
          unreadSet={unreadSet}
          onToggle={() => setShowCompletedAccordion(!showCompletedAccordion)}
          onLoadMore={() => {
            if (completedTasksQuery.hasNextPage) {
              void completedTasksQuery.fetchNextPage();
            }
          }}
          onTaskPress={(taskId) => navigation.navigate('TaskDetail', { taskId })}
          onOpenAttachment={openAttachmentModal}
          totalCount={completedTasksTotal}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },

  sectionsContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 170,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accentYellow,
  },
  sectionTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accentBrownText,
    fontWeight: typography.bold,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.uiGray4,
    color: colors.text,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: typography.bold,
  },

  metricFilterChipRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  metricFilterChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintStrong,
    paddingLeft: spacing.sm,
    paddingRight: 6,
    paddingVertical: 4,
  },
  metricFilterChipText: {
    fontSize: typography.xs,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  metricFilterChipClear: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray4,
  },
  metricFilterChipClearText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.bold,
  },

  createModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  createModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimDark40,
  },
  createSheet: {
    height: '92%',
    minHeight: 420,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 24,
  },
  createSheetTop: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorderAlpha25,
    backgroundColor: colors.surfaceOverlay,
  },
  createSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.uiGray4,
    marginBottom: spacing.sm,
  },
  createSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createSheetTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  createSheetClose: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray1,
  },
});
