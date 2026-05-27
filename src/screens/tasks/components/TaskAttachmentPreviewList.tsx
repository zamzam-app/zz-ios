import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';
import {
  AttachmentItem,
  WAVEFORM_BARS,
  formatDuration,
  getAttachmentIcon,
} from '../hooks/useTaskAttachmentUploads';

interface WaveformBarSpec {
  id: string;
  height: number;
}

interface TaskAttachmentPreviewListProps {
  attachments: AttachmentItem[];
  previewAttachmentId: string | null;
  activeAudioAttachmentId: string | null;
  previewPlayerStatus: {
    playing: boolean;
    currentTime: number;
    duration: number;
    didJustFinish: boolean;
  };
  waveBarSpecs: WaveformBarSpec[];
  onItemPress: (item: AttachmentItem) => void;
  onRemove: (id: string) => void;
}

export function TaskAttachmentPreviewList({
  attachments,
  previewAttachmentId,
  activeAudioAttachmentId,
  previewPlayerStatus,
  waveBarSpecs,
  onItemPress,
  onRemove,
}: TaskAttachmentPreviewListProps) {
  return (
    <>
      <View style={styles.attachmentListBox}>
        {attachments.length === 0 ? (
          <Text style={styles.noAttachmentsText}>No attachments</Text>
        ) : (
          <View style={styles.attachmentList}>
            {attachments.map((item) => {
              const isAudio = item.type === 'audio';
              const isPreviewed = previewAttachmentId === item.id;
              const isActiveAudio = isAudio && activeAudioAttachmentId === item.id;
              const totalSeconds = isAudio
                ? Math.max(
                    (item.durationMillis ?? 0) / 1000,
                    isActiveAudio ? previewPlayerStatus.duration : 0,
                  )
                : 0;
              const currentSeconds = isActiveAudio ? previewPlayerStatus.currentTime : 0;
              const currentMillis = Math.max(0, Math.floor(currentSeconds * 1000));
              const totalMillis = Math.max(0, Math.floor(totalSeconds * 1000));
              const progress = totalSeconds > 0 ? Math.min(currentSeconds / totalSeconds, 1) : 0;
              const activeBarCount = Math.round(progress * WAVEFORM_BARS.length);
              const statusLabel =
                item.status === 'uploaded'
                  ? 'Uploaded'
                  : item.status === 'failed'
                    ? 'Failed'
                    : 'Uploading';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.attachmentChip, isPreviewed && styles.attachmentChipActive]}
                  onPress={() => onItemPress(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.attachmentChipHeader}>
                    <View style={styles.attachmentChipMeta}>
                      <MaterialCommunityIcons
                        name={
                          getAttachmentIcon(
                            item.type,
                          ) as keyof typeof MaterialCommunityIcons.glyphMap
                        }
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.attachmentChipRight}>
                      <Text
                        style={[
                          styles.attachmentStatusText,
                          item.status === 'failed'
                            ? styles.attachmentStatusFailed
                            : item.status === 'uploaded'
                              ? styles.attachmentStatusUploaded
                              : styles.attachmentStatusUploading,
                        ]}
                      >
                        {statusLabel}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeAttachmentBtn}
                        onPress={(event) => {
                          event.stopPropagation();
                          onRemove(item.id);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons
                          name="trash-can-outline"
                          size={18}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {item.status === 'failed' && item.error ? (
                    <Text style={styles.attachmentErrorText} numberOfLines={2}>
                      {item.error}
                    </Text>
                  ) : null}

                  {isAudio && (
                    <View style={styles.audioPreviewRow}>
                      <TouchableOpacity
                        style={styles.audioPlayBtn}
                        onPress={() => onItemPress(item)}
                      >
                        <MaterialCommunityIcons
                          name={isActiveAudio && previewPlayerStatus.playing ? 'pause' : 'play'}
                          size={18}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                      <View style={styles.waveformRow}>
                        {waveBarSpecs.map(({ id, height: barHeight }, index) => (
                          <View
                            key={id}
                            style={[
                              styles.waveformBar,
                              {
                                height: barHeight,
                                backgroundColor:
                                  index < activeBarCount ? colors.primary : colors.border,
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text style={styles.audioDurationText}>
                        {`${formatDuration(currentMillis)} / ${formatDuration(totalMillis)}`}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  attachmentListBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 92,
    justifyContent: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background,
  },
  noAttachmentsText: {
    color: colors.textDisabled,
    fontSize: typography.sm,
    textAlign: 'center',
  },
  attachmentList: {
    gap: spacing.sm,
  },
  attachmentChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  attachmentChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  attachmentChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  attachmentChipMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },

  attachmentChipRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachmentStatusText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
  attachmentStatusUploading: {
    color: colors.textSecondary,
  },
  attachmentStatusUploaded: {
    color: colors.success,
  },
  attachmentStatusFailed: {
    color: colors.error,
  },
  attachmentErrorText: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: typography.xs,
  },
  removeAttachmentBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.errorLight,
  },
  audioPreviewRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  audioPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTintStrong,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waveformRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 20,
  },
  waveformBar: {
    width: 3,
    borderRadius: radius.full,
  },
  audioDurationText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    minWidth: 76,
    textAlign: 'right',
  },
});
