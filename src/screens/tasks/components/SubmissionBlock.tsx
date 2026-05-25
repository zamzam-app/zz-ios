import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { View, Text, FlatList as RNFlatList, StyleSheet, TouchableOpacity } from 'react-native';

import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';
import { formatDuration } from '../hooks/useTaskAudioController';
import { buildAttachmentName, cloudinaryThumbnail } from '../hooks/useTaskDetailController';

const WAVEFORM_BARS = [6, 10, 14, 8, 16, 7, 13, 9, 15, 6, 12, 10, 14, 7, 11, 9];
const WAVEFORM_BAR_SPECS = WAVEFORM_BARS.map((height, index) => ({ id: `wave_${index}`, height }));

interface SubmissionBlockProps {
  title: string;
  text?: string;
  attachments?: {
    images?: string[];
    videos?: string[];
    audios?: string[];
    files?: string[];
  };
  audioAttachmentMeta?: { id: string; url: string }[];
  audioPlayerStatus?: {
    playing: boolean;
    currentTime: number;
    duration: number;
    didJustFinish: boolean;
  };
  activeAudioAttachmentId?: string | null;
  audioDurationById?: Record<string, number>;
  onAudioPress?: (id: string, url: string) => void;
  onOpenAttachment: (url: string, type?: 'image' | 'video' | 'audio' | 'file') => void;
  onRemoveAttachment?: (type: 'images' | 'videos' | 'audios' | 'files', index: number) => void;
}

export function SubmissionBlock({
  title,
  text,
  attachments,
  audioAttachmentMeta = [],
  audioPlayerStatus,
  activeAudioAttachmentId,
  audioDurationById = {},
  onAudioPress,
  onOpenAttachment,
  onRemoveAttachment,
}: SubmissionBlockProps) {
  const imageItems = attachments?.images ?? [];
  const videoItems = attachments?.videos ?? [];
  const audioItems = attachments?.audios ?? [];
  const fileItems = attachments?.files ?? [];
  const hasAny =
    Boolean(text?.trim()) ||
    imageItems.length > 0 ||
    videoItems.length > 0 ||
    audioItems.length > 0 ||
    fileItems.length > 0;

  if (!hasAny) return null;

  return (
    <View style={styles.submissionCard}>
      <Text style={styles.submissionTitle}>{title}</Text>
      {text?.trim() ? <Text style={styles.submissionText}>{text.trim()}</Text> : null}

      {imageItems.length > 0 && (
        <View style={styles.attachmentGroup}>
          <Text style={styles.attachmentGroupTitle}>Images</Text>
          <RNFlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={imageItems}
            keyExtractor={(url) => `${title}-image-${url}`}
            contentContainerStyle={styles.imageRow}
            renderItem={({ item: url }) => (
              <TouchableOpacity
                onPress={() => onOpenAttachment(url, 'image')}
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

      {videoItems.map((url, index) => (
        <TouchableOpacity
          key={`${title}-video-${url}`}
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(url, 'video')}
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

      {audioItems.length > 0 && (
        <View style={styles.attachmentGroup}>
          {audioItems.map((url, index) => {
            const meta = audioAttachmentMeta.find((m) => m.url === url);
            const audioId = meta?.id ?? `audio-${index}-${url}`;
            const isActiveAudio = activeAudioAttachmentId === audioId;
            const knownDurationMs = audioDurationById[audioId] ?? 0;
            const liveDurationMs =
              isActiveAudio && audioPlayerStatus
                ? Math.max(Math.floor(audioPlayerStatus.duration * 1000), knownDurationMs)
                : knownDurationMs;
            const currentMillis =
              isActiveAudio && audioPlayerStatus
                ? Math.max(0, Math.floor(audioPlayerStatus.currentTime * 1000))
                : 0;
            const remainingMillis = Math.max(liveDurationMs - currentMillis, 0);
            const progress = liveDurationMs > 0 ? Math.min(currentMillis / liveDurationMs, 1) : 0;
            const activeBarCount = Math.round(progress * WAVEFORM_BARS.length);
            const durationLabel = liveDurationMs > 0 ? formatDuration(remainingMillis) : '--:--';

            return (
              <View key={`${title}-audio-${url}`} style={styles.audioAttachmentCard}>
                <View style={styles.audioPreviewRow}>
                  <View style={styles.waveformRow}>
                    {WAVEFORM_BAR_SPECS.map(({ id, height: barHeight }, barIndex) => (
                      <View
                        key={id}
                        style={[
                          styles.waveformBar,
                          {
                            height: barHeight,
                            backgroundColor:
                              barIndex < activeBarCount ? colors.primary : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.audioDurationText}>{durationLabel}</Text>
                  <TouchableOpacity
                    style={styles.audioPlayBtn}
                    onPress={() => onAudioPress?.(audioId, url)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isActiveAudio && audioPlayerStatus?.playing ? 'pause' : 'play'}
                      size={16}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  {onRemoveAttachment && (
                    <TouchableOpacity
                      style={styles.removeAudioBtn}
                      onPress={() => onRemoveAttachment('audios', index)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {fileItems.map((url, index) => (
        <TouchableOpacity
          key={`${title}-file-${url}`}
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(url, 'file')}
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
  );
}

const styles = StyleSheet.create({
  submissionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  submissionTitle: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  submissionText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  attachmentGroup: { marginBottom: spacing.sm },
  attachmentGroupTitle: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  imageRow: { gap: spacing.sm, paddingTop: 2 },
  imageItem: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
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
  audioAttachmentCard: {
    borderWidth: 1,
    borderColor: colors.warmBorderDefault,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  audioPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  audioPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmBgMedium,
    borderWidth: 1,
    borderColor: colors.warmBorderDefault,
  },
  waveformRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 20 },
  waveformBar: { width: 3, borderRadius: 10 },
  audioDurationText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    minWidth: 76,
    textAlign: 'right',
  },
  removeAudioBtn: { padding: 4 },
});
