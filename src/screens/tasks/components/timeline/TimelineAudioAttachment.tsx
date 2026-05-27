import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors, spacing, radius, typography } from '../../../../theme/theme';

import { useTimelineAudio } from './TimelineAudioContext';

// ─── Waveform bars ──────────────────────────────────────────────────────────
// Static visual pattern inspired by WhatsApp voice messages.
const WAVEFORM_BARS = [6, 10, 14, 8, 16, 7, 13, 9, 15, 6, 12, 10, 14, 7, 11, 9] as const;

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TimelineAudioAttachmentProps {
  url: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

function TimelineAudioAttachment({ url }: TimelineAudioAttachmentProps) {
  const {
    onPlayAudio,
    activeAudioUrl,
    isAudioPlaying,
    audioCurrentTime,
    audioDuration,
    audioDidJustFinish,
    audioDurationByUrl,
  } = useTimelineAudio();

  const isActive = activeAudioUrl === url;

  // For the active audio: use real-time playback position from the player.
  // For non-active audio: use the stored per-URL duration (if known).
  const activeDurationMs = Math.max(0, Math.floor(audioDuration * 1000));
  const ownDurationMs = audioDurationByUrl[url]
    ? Math.max(0, audioDurationByUrl[url]) // already in ms
    : 0;
  const ownDurationKnown = ownDurationMs > 0;

  const durationMs = isActive ? activeDurationMs : ownDurationMs;
  const currentMs = isActive ? Math.max(0, Math.floor(audioCurrentTime * 1000)) : 0;
  const remainingMs = Math.max(0, durationMs - currentMs);

  const isFinished =
    isActive && (audioDidJustFinish || (durationMs > 0 && currentMs >= durationMs));

  // Progress for waveform bars: 0..1 (only relevant for active audio)
  const progress = isActive && durationMs > 0 ? Math.min(audioCurrentTime / audioDuration, 1) : 0;
  const activeBarCount = Math.round(progress * WAVEFORM_BARS.length);

  const displayText = useMemo(() => {
    if (!isActive) {
      // Not this audio: show own total duration if known, or placeholder
      return ownDurationKnown ? formatDuration(durationMs) : '--:--';
    }
    if (isFinished) {
      // Playback completed: show 0:00
      return formatDuration(0);
    }
    if (isAudioPlaying) {
      // Playing: show remaining time (decrements in real time)
      return `-${formatDuration(remainingMs)}`;
    }
    // Active but paused: show current position
    return formatDuration(currentMs);
  }, [isActive, isAudioPlaying, isFinished, ownDurationKnown, durationMs, remainingMs, currentMs]);

  return (
    <View style={styles.container}>
      {/* Play/Pause button */}
      <TouchableOpacity
        style={styles.playButton}
        onPress={() => onPlayAudio(url)}
        activeOpacity={0.7}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name={isActive && isAudioPlaying ? 'pause' : 'play'} size={14} color="#FFF" />
      </TouchableOpacity>

      {/* Waveform visualization */}
      <View style={styles.waveformRow}>
        {WAVEFORM_BARS.map((barHeight, index) => (
          <View
            // eslint-disable-next-line react/no-array-index-key
            key={`${url}-bar-${index}`}
            style={[
              styles.waveformBar,
              {
                height: barHeight,
                backgroundColor: index < activeBarCount ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Duration text */}
      <Text style={styles.durationText}>{displayText}</Text>
    </View>
  );
}

export default React.memo(TimelineAudioAttachment);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 220,
    maxWidth: 280,
  },
  playButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  durationText: {
    fontSize: typography.xs,
    fontWeight: typography.medium,
    color: colors.textSecondary,
    minWidth: 44,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
