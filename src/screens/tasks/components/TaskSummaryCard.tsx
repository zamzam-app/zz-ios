import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { View, Text, FlatList as RNFlatList, StyleSheet, TouchableOpacity } from 'react-native';

import StatusBadge from '../../../components/shared/StatusBadge';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';
import type { SerializedTimelineEvent } from '../../../types/task';
import {
  buildAttachmentName,
  cloudinaryThumbnail,
  formatDate,
  PRIORITY_COLORS,
} from '../hooks/useTaskDetailController';
import { getTaskAssigneeNames, getTaskCategoryName, getTaskOutletName } from '../taskDisplay';

import { SubmissionBlock } from './SubmissionBlock';

interface AttachmentMeta {
  id: string;
  url: string;
}

interface SourceAttachments {
  images: string[];
  videos: string[];
  savedAudios: string[];
  audios: string[];
  files: string[];
  audioMeta: AttachmentMeta[];
  audioIdsKey: string;
  count: number;
  hasAny: boolean;
}

interface AudioPlayerStatus {
  playing: boolean;
  currentTime: number;
  duration: number;
  didJustFinish: boolean;
}

interface TaskSummaryCardProps {
  // These come from loosely-typed API data — use Record for type safety
  source: Record<string, unknown>;
  legacyTask?: Record<string, unknown>;
  taskDetail?: Record<string, unknown>;
  filteredEvents: SerializedTimelineEvent[];
  sourceAttachments: SourceAttachments;
  completedAtIso: string | null;
  openAttachment: (url: string, type?: 'image' | 'video' | 'audio' | 'file') => void;
  previewPlayerStatus: AudioPlayerStatus;
  activeAudioAttachmentId: string | null;
  audioDurationById: Record<string, number>;
  handleAudioAttachmentPress: (id: string, url: string) => void;
  isAdmin: boolean;
  managerText: string;
  managerAttachments: { images: string[]; videos: string[]; audios: string[]; files: string[] };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export function TaskSummaryCard({
  source,
  legacyTask,
  taskDetail,
  filteredEvents,
  sourceAttachments,
  completedAtIso,
  openAttachment,
  previewPlayerStatus,
  activeAudioAttachmentId,
  audioDurationById,
  handleAudioAttachmentPress,
  isAdmin,
  managerText,
  managerAttachments,
}: TaskSummaryCardProps) {
  if (!source) return null;

  const isOverdue =
    (source.status as string) !== 'COMPLETED' && new Date(source.dueDate as string) < new Date();
  const outletName = getTaskOutletName(source as never, legacyTask as never);
  const categoryName = getTaskCategoryName(source as never, legacyTask as never);
  const assigneeNames = getTaskAssigneeNames(source as never, legacyTask as never, [
    ...((((taskDetail as Record<string, unknown>)?.timeline as Record<string, unknown> | undefined)
      ?.data as SerializedTimelineEvent[]) ?? []),
    ...filteredEvents,
  ]);
  const isNotCompleted = (source.status as string) !== 'COMPLETED' && !isAdmin;

  return (
    <View>
      {/* ── Summary Card ──────────────────────────────────────────────── */}
      <View style={styles.summaryCard}>
        <View style={styles.ownerTopRow}>
          <View style={styles.ownerHeadingWrap}>
            <View style={styles.ownerTitleRow}>
              {' '}
              <Text style={styles.ownerTitle}>{categoryName || 'Task'}</Text>
              {isOverdue ? <Text style={styles.overdueTopTag}>Overdue</Text> : null}
            </View>
            {outletName ? <Text style={styles.ownerOutlet}>{outletName}</Text> : null}
          </View>
          <View style={styles.ownerBadgeWrap}>
            <View style={styles.ownerStatusPriorityRow}>
              <StatusBadge status={source.status as string} />
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor:
                      (PRIORITY_COLORS[source.priority as string] ?? colors.textSecondary) + '22',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    { color: PRIORITY_COLORS[source.priority as string] ?? colors.textSecondary },
                  ]}
                >
                  {source.priority as string}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Row
          label="Due Date"
          value={formatDate(source.dueDate as string, source.dueTime as string)}
        />
        <Row label="Created" value={formatDate(source.createdAt as string)} />
        {completedAtIso && <Row label="Completed" value={formatDate(completedAtIso)} />}

        {assigneeNames.length > 0 && (
          <>
            <Text style={styles.ownerDescriptionLabel}>Assigned Managers</Text>
            <Text style={styles.description}>{assigneeNames.join(', ')}</Text>
          </>
        )}

        <Text style={styles.ownerDescriptionLabel}>Description</Text>
        <Text style={styles.description}>{source.description as string}</Text>

        {/* Attachments gallery (only for completed tasks) */}
        {(source.status as string) === 'COMPLETED' && sourceAttachments.hasAny && (
          <View style={styles.attachmentsInlineWrap}>
            <Text style={styles.ownerDescriptionLabel}>Attachments</Text>
            {sourceAttachments.images.length > 0 && (
              <View style={styles.attachmentGroup}>
                <Text style={styles.attachmentGroupTitle}>Images</Text>
                <RNFlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={sourceAttachments.images}
                  keyExtractor={(url: string) => `image-${url}`}
                  contentContainerStyle={styles.imageRow}
                  renderItem={({ item: url }) => (
                    <TouchableOpacity
                      onPress={() => {
                        void openAttachment(url, 'image');
                      }}
                      style={styles.imageItem}
                      activeOpacity={0.85}
                    >
                      <ExpoImage
                        source={{ uri: cloudinaryThumbnail(url) }}
                        style={styles.imageThumb}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {sourceAttachments.videos.length > 0 && (
              <View style={styles.attachmentGroup}>
                <Text style={styles.attachmentGroupTitle}>Videos</Text>
                {sourceAttachments.videos.map((url: string, index: number) => (
                  <TouchableOpacity
                    key={`video-${url}`}
                    style={styles.attachmentRow}
                    onPress={() => {
                      void openAttachment(url, 'video');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.attachmentRowLeft}>
                      <Ionicons name="videocam-outline" size={16} color={colors.textWarmBrown} />
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {buildAttachmentName(url, 'video', index)}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {sourceAttachments.savedAudios.length > 0 && (
              <SubmissionBlock
                title="Audio"
                onOpenAttachment={openAttachment}
                attachments={{ audios: sourceAttachments.savedAudios }}
                audioAttachmentMeta={sourceAttachments.audioMeta}
                audioPlayerStatus={previewPlayerStatus}
                activeAudioAttachmentId={activeAudioAttachmentId}
                audioDurationById={audioDurationById}
                onAudioPress={handleAudioAttachmentPress}
              />
            )}

            {sourceAttachments.files.length > 0 && (
              <View style={styles.attachmentGroup}>
                <Text style={styles.attachmentGroupTitle}>Files</Text>
                {sourceAttachments.files.map((url: string, index: number) => (
                  <TouchableOpacity
                    key={`file-${url}`}
                    style={styles.attachmentRow}
                    onPress={() => {
                      void openAttachment(url, 'file');
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.attachmentRowLeft}>
                      <Ionicons name="document-outline" size={16} color={colors.textWarmBrown} />
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {buildAttachmentName(url, 'file', index)}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Activity Section Header ────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeadingWrap}>
          <View style={[styles.sectionDot, styles.sectionDotActivity]} />
          <Text style={styles.sectionTitle}>Activity</Text>
        </View>
        <Text style={styles.sectionCount}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Manager Submission Section ────────────────────────────────── */}
      {!isNotCompleted &&
      (managerText.trim().length > 0 ||
        managerAttachments.images.length > 0 ||
        managerAttachments.videos.length > 0 ||
        managerAttachments.audios.length > 0 ||
        managerAttachments.files.length > 0) ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeadingWrap}>
              <View style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>Manager Submission</Text>
            </View>
          </View>
          <SubmissionBlock
            title="Submitted Details"
            text={managerText}
            attachments={managerAttachments}
            onOpenAttachment={(url, type) => {
              void openAttachment(url, type);
            }}
            audioAttachmentMeta={sourceAttachments.audioMeta}
            audioPlayerStatus={previewPlayerStatus}
            activeAudioAttachmentId={activeAudioAttachmentId}
            audioDurationById={audioDurationById}
            onAudioPress={handleAudioAttachmentPress}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warmBorderDefaultAlpha50,
    ...shadow.sm,
  },
  ownerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ownerHeadingWrap: { flex: 1, gap: 2 },
  ownerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ownerTitle: { fontSize: 16, color: colors.textWarmDark, fontWeight: '800' },
  ownerOutlet: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  ownerBadgeWrap: { alignItems: 'flex-end' },
  ownerStatusPriorityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  priorityText: { fontSize: typography.xs, fontWeight: '700' },
  description: { fontSize: typography.sm, color: colors.textSecondary, lineHeight: 20 },
  ownerDescriptionLabel: {
    marginTop: spacing.sm,
    marginBottom: 4,
    fontSize: typography.sm,
    color: colors.textWarmDark,
    fontWeight: '700',
  },
  overdueTopTag: { color: colors.error, fontSize: typography.xs, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorderDefault,
  },
  rowLabel: { fontSize: typography.sm, color: colors.textSecondary },
  rowValue: {
    fontSize: typography.sm,
    color: colors.textWarmDark,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  attachmentsInlineWrap: { marginTop: spacing.sm },
  attachmentGroup: { marginBottom: spacing.sm },
  attachmentGroupTitle: {
    fontSize: typography.sm,
    color: colors.textWarmDark,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  imageRow: { gap: spacing.sm, paddingTop: 2 },
  imageItem: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.warmBorderDefault,
  },
  imageThumb: { width: 108, height: 108, backgroundColor: colors.warmBgLight },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.warmBorderDefault,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  attachmentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginRight: spacing.sm,
  },
  attachmentName: { fontSize: typography.sm, color: colors.textSecondary, flex: 1 },
  sectionHeader: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 100,
    backgroundColor: colors.accentYellowWarm,
  },
  sectionDotActivity: { backgroundColor: colors.accentBlueWarm },
  sectionTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textWarmMuted,
    fontWeight: '800',
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: colors.warmChipBg,
    color: colors.textWarmDark,
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '800',
  },
});
