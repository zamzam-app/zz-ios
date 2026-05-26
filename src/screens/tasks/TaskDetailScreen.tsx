import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TasksStackParamList } from '../../navigation/TasksNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import {
  TaskDetailHeader,
  TaskSummaryCard,
  TaskActivityTimeline,
  TaskEditSheet,
  TaskAttachmentViewer,
  TaskSubmissionSheet,
} from './components';
import DelegationSheet from './components/DelegationSheet';
import { TimelineSkeleton } from './components/timeline';
import { useTaskDetailController } from './hooks/useTaskDetailController';

type Props = NativeStackScreenProps<TasksStackParamList, 'TaskDetail'>;

export default function TaskDetailScreen({ route, navigation }: Props) {
  const { taskId } = route.params;
  const user = useAuthStore((state) => state.user);

  const ctrl = useTaskDetailController(taskId, {
    goBack: () => navigation.goBack(),
    canGoBack: () => navigation.canGoBack(),
    navigate: (routeName: string) => navigation.navigate(routeName as never),
  });

  // Wrap stopAudioRecording to upload the recorded file (original behavior)
  const handleStopRecording = useCallback(async () => {
    const uri = await ctrl.stopAudioRecording();
    if (uri) {
      await ctrl.uploadLocalFile('audios', uri);
    }
  }, [ctrl]);

  // ─── Loading state (with header) ────────────────────────────────────────
  if (ctrl.isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <TaskDetailHeader onBack={ctrl.handleBack} />
        <TimelineSkeleton />
      </SafeAreaView>
    );
  }

  // ─── API confirmed task is unavailable ─────────────────────────────────
  if (ctrl.isTaskNotFound) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textDisabled} />
        <Text style={styles.notFoundText}>Task not found</Text>
        <Text style={styles.emptyTimelineSubtext}>
          This task may have been deleted or you may not have access
        </Text>
      </SafeAreaView>
    );
  }

  // ─── API error or invalid empty response with no fallback ───────────────
  if (ctrl.hasLoadError || (ctrl.allQueriesComplete && !ctrl.source)) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textDisabled} />
        <Text style={styles.notFoundText}>Failed to load task</Text>
        <Text style={styles.emptyTimelineSubtext}>Check your connection and try again</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            void ctrl.timelineQuery.refetch();
            void ctrl.eventTypeCountsQuery.refetch();
            void ctrl.refetchDetail();
            void ctrl.refetchLegacy();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="refresh"
            size={16}
            color={colors.textInverse}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Full list of guards above ensures source is defined here ─────────
  // TypeScript can't infer the logical relationship, so assert once:
  const taskSource = ctrl.source!;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <TaskDetailHeader onBack={ctrl.handleBack} />

      {/* ── Summary Card + Manager Submission ─────────────────────────── */}
      <TaskSummaryCard
        source={taskSource as unknown as Record<string, unknown>}
        legacyTask={ctrl.legacyTask as unknown as Record<string, unknown> | undefined}
        taskDetail={ctrl.taskDetail as unknown as Record<string, unknown> | undefined}
        filteredEvents={ctrl.timelineEvents}
        sourceAttachments={ctrl.sourceAttachments}
        completedAtIso={ctrl.completedAtIso}
        openAttachment={ctrl.openAttachment}
        previewPlayerStatus={ctrl.previewPlayerStatus}
        activeAudioAttachmentId={ctrl.activeAudioAttachmentId}
        audioDurationById={ctrl.audioDurationById}
        handleAudioAttachmentPress={ctrl.handleAudioAttachmentPress}
        isAdmin={ctrl.isAdmin}
        managerText={ctrl.managerText}
        managerAttachments={ctrl.managerAttachments}
      />

      {/* ── Activity Timeline ─────────────────────────────────────────── */}
      <TaskActivityTimeline
        filteredEvents={ctrl.timelineEvents}
        timelineQuery={ctrl.timelineQuery}
        isLoading={ctrl.isLoading}
        handleRefresh={ctrl.handleRefresh}
        handleLoadMore={ctrl.handleLoadMore}
        onAttachmentPress={ctrl.handleAttachmentPress}
        onActorPress={ctrl.handleActorPress}
      />

      {/* ── Bottom Action Bar ─────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarInner}>
          {/* Complete/Reopen Button */}
          <TouchableOpacity
            style={styles.bottomBarBtn}
            onPress={ctrl.handleStatusChange}
            activeOpacity={0.82}
            accessibilityLabel={taskSource.status === 'COMPLETED' ? 'Reopen task' : 'Complete task'}
          >
            <Ionicons
              name={taskSource.status === 'COMPLETED' ? 'refresh' : 'checkmark-circle-outline'}
              size={20}
              color={colors.textInverse}
            />
          </TouchableOpacity>

          {/* Edit Button */}
          {ctrl.isAdmin && (
            <TouchableOpacity
              style={styles.bottomBarBtn}
              onPress={() => ctrl.setShowEditModal(true)}
              activeOpacity={0.82}
              accessibilityLabel="Edit task"
            >
              <Ionicons name="create-outline" size={20} color={colors.textInverse} />
            </TouchableOpacity>
          )}

          {/* Add Attachment (+) Button */}
          <TouchableOpacity
            style={[
              styles.bottomBarBtn,
              taskSource.status === 'COMPLETED' && styles.bottomBarBtnDisabled,
            ]}
            onPress={() => ctrl.setShowSubmissionModal(true)}
            disabled={taskSource.status === 'COMPLETED'}
            activeOpacity={0.82}
            accessibilityLabel="Add attachment"
          >
            <Ionicons name="add" size={24} color={colors.textInverse} />
          </TouchableOpacity>

          {/* Delete Button */}
          {ctrl.isAdmin && (
            <TouchableOpacity
              style={[
                styles.bottomBarBtn,
                styles.bottomBarBtnDelete,
                ctrl.deleteTask.isPending && styles.bottomBarBtnDisabled,
              ]}
              onPress={ctrl.handleDelete}
              disabled={ctrl.deleteTask.isPending}
              activeOpacity={0.82}
              accessibilityLabel="Delete task"
            >
              {ctrl.deleteTask.isPending ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          )}

          {/* Delegate Button */}
          <TouchableOpacity
            style={[styles.bottomBarBtn, styles.bottomBarBtnSecondary]}
            activeOpacity={0.82}
            onPress={() => ctrl.setShowDelegationSheet(true)}
            accessibilityLabel="Delegate task"
          >
            <Ionicons name="person-add-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Edit Modal ────────────────────────────────────────────────── */}
      <TaskEditSheet
        visible={ctrl.showEditModal}
        onClose={() => ctrl.setShowEditModal(false)}
        editTask={ctrl.legacyTask}
        onSuccess={() => {
          void ctrl.refetchDetail();
          void ctrl.timelineQuery.refetch();
        }}
      />

      {/* ── Image Viewer Modal ────────────────────────────────────────── */}
      <TaskAttachmentViewer
        imageUrl={ctrl.viewerImageUrl}
        onClose={() => ctrl.setViewerImageUrl(null)}
      />

      {/* ── Submission Modal ──────────────────────────────────────────── */}
      <TaskSubmissionSheet
        visible={ctrl.showSubmissionModal}
        onClose={() => ctrl.setShowSubmissionModal(false)}
        managerText={ctrl.managerText}
        onManagerTextChange={ctrl.setManagerText}
        isRecordingAudio={ctrl.isRecordingAudio}
        recordingMillis={ctrl.recordingMillis}
        recordingBusy={ctrl.recordingBusy}
        onStartRecording={ctrl.startAudioRecording}
        onStopRecording={handleStopRecording}
        onDiscardRecording={ctrl.discardAudioRecording}
        uploadingType={ctrl.uploadingType}
        onTakePhoto={ctrl.takePhoto}
        onPickImage={ctrl.pickImage}
        onPickVideo={ctrl.pickVideo}
        onPickFile={ctrl.pickFile}
        managerAttachments={ctrl.managerAttachments}
        onRemoveAttachment={ctrl.removeAttachmentUrl}
        onOpenAttachment={ctrl.openAttachment}
        sourceAttachmentsAudioMeta={ctrl.sourceAttachments.audioMeta}
        previewPlayerStatus={ctrl.previewPlayerStatus}
        activeAudioAttachmentId={ctrl.activeAudioAttachmentId}
        audioDurationById={ctrl.audioDurationById}
        onAudioPress={ctrl.handleAudioAttachmentPress}
        onSave={ctrl.saveManagerSubmission}
        isSavingAttachments={ctrl.addAttachmentsMutation.isPending}
        isSavingComment={ctrl.addCommentMutation.isPending}
      />

      {/* ── Delegation Sheet ──────────────────────────────────────────── */}
      <DelegationSheet
        visible={ctrl.showDelegationSheet}
        onClose={() => ctrl.setShowDelegationSheet(false)}
        taskId={taskId}
        taskDescription={taskSource.description}
        excludeUserIds={[
          ...(((taskSource as unknown as Record<string, unknown>)?.assigneeIds as
            | string[]
            | undefined) ?? []),
          ...(user?.id ? [user.id] : []),
          ...(user?._id ? [user._id] : []),
        ]}
        outletId={ctrl.resolvedOutletId}
      />
    </SafeAreaView>
  );
}

// ─── Remaining styles (not moved to components) ────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Bottom Action Bar ────────────────────────────────────────────────────
  bottomBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: 104,
    ...shadow.md,
  },
  bottomBarInner: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bottomBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  bottomBarBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomBarBtnDelete: {
    backgroundColor: colors.error,
  },
  bottomBarBtnDisabled: {
    opacity: 0.6,
  },

  // ── Error / Retry States ──────────────────────────────────────────────────
  notFoundText: {
    marginTop: spacing.sm,
    fontSize: typography.base,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  emptyTimelineSubtext: {
    marginTop: spacing.xs,
    fontSize: typography.sm,
    color: colors.textDisabled,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    ...shadow.sm,
  },
  retryBtnText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: '700' as const,
  },
});
