import React, { createContext, useContext } from 'react';

// ─── Context Value ──────────────────────────────────────────────────────────

export interface TimelineAudioContextValue {
  onPlayAudio: (url: string) => void;
  /** The URL of the currently active (loaded) audio, or null */
  activeAudioUrl: string | null;
  /** Whether the active audio is currently playing */
  isAudioPlaying: boolean;
  /** Playback position of the active audio (0..1) */
  audioCurrentTime: number;
  /** Duration of the active audio in seconds (from previewPlayerStatus) */
  audioDuration: number;
  audioDidJustFinish: boolean;
  /**
   * Known durations by audio URL, accumulated as each audio is played.
   * Used by non-active TimelineAudioAttachment instances to show their
   * own total duration rather than showing the active audio's duration.
   */
  audioDurationByUrl: Record<string, number>;
}

// ─── Context ────────────────────────────────────────────────────────────────

const TimelineAudioContext = createContext<TimelineAudioContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function TimelineAudioProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TimelineAudioContextValue;
}) {
  return <TimelineAudioContext.Provider value={value}>{children}</TimelineAudioContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTimelineAudio(): TimelineAudioContextValue {
  const ctx = useContext(TimelineAudioContext);
  if (!ctx) {
    // Return no-op defaults when no provider is present (e.g. outside timeline)
    return {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onPlayAudio: () => {},
      activeAudioUrl: null,
      isAudioPlaying: false,
      audioCurrentTime: 0,
      audioDuration: 0,
      audioDidJustFinish: false,
      audioDurationByUrl: {},
    };
  }
  return ctx;
}
