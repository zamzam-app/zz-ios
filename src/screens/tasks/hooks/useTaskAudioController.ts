import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

const AUDIO_FILE_WAIT_RETRIES = 25;
const AUDIO_FILE_WAIT_DELAY_MS = 120;

function normalizeLocalFileUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('file://')) return trimmed;
  if (trimmed.startsWith('file:/')) {
    const pathOnly = trimmed.replace(/^file:\/*/, '');
    return `file://${pathOnly}`;
  }
  if (trimmed.startsWith('/')) return `file://${trimmed}`;
  return trimmed;
}

function isReleasedAudioPlayerError(error: unknown) {
  return (
    error instanceof Error &&
    /already released|cannot be cast to type expo\.modules\.audio\.AudioPlayer/i.test(error.message)
  );
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

interface AudioMetaItem {
  id: string;
  url: string;
}

export function useTaskAudioController(audioMeta: AudioMetaItem[], audioIdsKey: string) {
  const previewPlayer = useAudioPlayer(null, { updateInterval: 150 });
  const previewPlayerStatus = useAudioPlayerStatus(previewPlayer);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const isRecordingAudio = recorderState.isRecording;
  const recordingMillis = recorderState.durationMillis;
  const isRecordingRef = useRef(false);

  const [activeAudioAttachmentId, setActiveAudioAttachmentId] = useState<string | null>(null);
  const [pendingPlayAudioId, setPendingPlayAudioId] = useState<string | null>(null);
  const [probingAudioAttachmentId, setProbingAudioAttachmentId] = useState<string | null>(null);
  const [audioDurationById, setAudioDurationById] = useState<Record<string, number>>({});
  const [recordingBusy, setRecordingBusy] = useState(false);

  const runPreviewPlayerActionSafely = useCallback((action: () => unknown): boolean => {
    try {
      const result = action();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((error) => {
          if (!isReleasedAudioPlayerError(error)) {
            console.warn('[TaskDetail] Audio preview action failed', error);
          }
        });
      }
      return true;
    } catch (error) {
      if (!isReleasedAudioPlayerError(error)) {
        console.warn('[TaskDetail] Audio preview action failed', error);
      }
      return false;
    }
  }, []);

  // Audio mode setup on mount
  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
    }).catch((err) => console.warn('[TaskDetail] Failed to set audio mode on mount', err));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
    };
  }, [previewPlayer, runPreviewPlayerActionSafely]);

  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        try {
          if (recorder.getStatus().isRecording) {
            recorder.stop().catch((err) => {
              console.warn('[TaskDetail] Cleanup: Failed to stop recorder', err);
            });
          }
        } catch {
          // Catch silently if the native Shared Object has already been released
        }
      }
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch((err) => {
        console.warn('[TaskDetail] Cleanup: Failed to reset audio mode', err);
      });
    };
  }, [recorder]);

  useEffect(() => {
    isRecordingRef.current = isRecordingAudio;
  }, [isRecordingAudio]);

  // Probe audio durations for attachments without known duration
  const durationTargetAudioId = activeAudioAttachmentId ?? probingAudioAttachmentId;
  useEffect(() => {
    if (!durationTargetAudioId) return;
    const durationMillis = Math.max(0, Math.floor(previewPlayerStatus.duration * 1000));
    if (durationMillis <= 0) return;

    queueMicrotask(() => {
      setAudioDurationById((prev) => {
        if (prev[durationTargetAudioId] === durationMillis) return prev;
        return { ...prev, [durationTargetAudioId]: durationMillis };
      });
      if (probingAudioAttachmentId === durationTargetAudioId) {
        setProbingAudioAttachmentId(null);
      }
    });
  }, [
    activeAudioAttachmentId,
    probingAudioAttachmentId,
    previewPlayerStatus.duration,
    durationTargetAudioId,
  ]);

  // Probe next audio attachment duration
  useEffect(() => {
    if (activeAudioAttachmentId || previewPlayerStatus.playing || probingAudioAttachmentId) return;
    const nextToProbe = audioMeta.find((item) => !audioDurationById[item.id]);
    if (!nextToProbe) return;

    const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(nextToProbe.url));
    if (!replaced) return;
    queueMicrotask(() => setProbingAudioAttachmentId(nextToProbe.id));
  }, [
    activeAudioAttachmentId,
    previewPlayerStatus.playing,
    probingAudioAttachmentId,
    audioMeta,
    audioIdsKey,
    audioDurationById,
    previewPlayer,
    runPreviewPlayerActionSafely,
  ]);

  // Play pending audio once loaded
  useEffect(() => {
    if (!pendingPlayAudioId || !previewPlayerStatus.isLoaded) return;
    runPreviewPlayerActionSafely(() => previewPlayer.play());
    queueMicrotask(() => setPendingPlayAudioId(null));
  }, [
    pendingPlayAudioId,
    previewPlayerStatus.isLoaded,
    previewPlayer,
    runPreviewPlayerActionSafely,
  ]);

  // Clear active audio if attachment removed from meta
  // URL-based IDs (from timeline audio) are not in audioMeta — skip the guard
  useEffect(() => {
    if (!activeAudioAttachmentId) return;
    if (activeAudioAttachmentId.startsWith('http')) return;
    if (!audioMeta.some((m) => m.id === activeAudioAttachmentId)) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      queueMicrotask(() => {
        setActiveAudioAttachmentId(null);
        setPendingPlayAudioId(null);
      });
    }
  }, [
    activeAudioAttachmentId,
    audioMeta,
    audioIdsKey,
    previewPlayer,
    runPreviewPlayerActionSafely,
  ]);

  // Clear probing if attachment removed
  useEffect(() => {
    if (!probingAudioAttachmentId) return;
    if (!audioMeta.some((m) => m.id === probingAudioAttachmentId)) {
      queueMicrotask(() => setProbingAudioAttachmentId(null));
    }
  }, [probingAudioAttachmentId, audioMeta, audioIdsKey]);

  const waitForRecordedAudioFile = async (uri: string): Promise<number> => {
    for (let attempt = 0; attempt < AUDIO_FILE_WAIT_RETRIES; attempt += 1) {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory && info.size > 0) return info.size;
      await new Promise((resolve) => setTimeout(resolve, AUDIO_FILE_WAIT_DELAY_MS));
    }
    const finalInfo = await FileSystem.getInfoAsync(uri);
    if (finalInfo.exists && !finalInfo.isDirectory) return finalInfo.size;
    return 0;
  };

  const stageRecordedAudioForUpload = async (uri: string): Promise<string> => {
    const normalizedUri = normalizeLocalFileUri(uri);
    const recordedSize = await waitForRecordedAudioFile(normalizedUri);
    if (recordedSize <= 0) throw new Error('Recorded audio file is unavailable.');

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return normalizedUri;
    const extFromUri = normalizedUri.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
    const ext = extFromUri && /^[a-z0-9]+$/.test(extFromUri) ? extFromUri : 'm4a';
    const stagedUri = `${cacheDir}task-audio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    try {
      await FileSystem.copyAsync({ from: normalizedUri, to: stagedUri });
      return stagedUri;
    } catch {
      return normalizedUri;
    }
  };

  const startAudioRecording = async () => {
    if (recordingBusy || isRecordingAudio) return;
    setRecordingBusy(true);
    runPreviewPlayerActionSafely(() => previewPlayer.pause());
    setActiveAudioAttachmentId(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Microphone access is required to record audio.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      console.warn('[TaskDetail] Start recording failed', error);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
      Alert.alert('Error', 'Could not start recording. Please try again.');
    } finally {
      setRecordingBusy(false);
    }
  };

  const stopAudioRecording = async () => {
    if (recordingBusy || !isRecordingAudio) return;
    setRecordingBusy(true);
    try {
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status.url || recorder.uri || null;
      if (uri) {
        const uploadUri = await stageRecordedAudioForUpload(uri);
        return uploadUri;
      }
    } catch (error) {
      console.warn('[TaskDetail] Stop recording failed', error);
      Alert.alert('Error', 'Could not stop recording. Please try again.');
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
      setRecordingBusy(false);
    }
    return null;
  };

  const discardAudioRecording = async () => {
    if (recordingBusy || !isRecordingAudio) return;
    setRecordingBusy(true);
    try {
      await recorder.stop();
    } catch {
      // Ignore errors during discard stop
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
      setRecordingBusy(false);
    }
  };

  const handleAudioAttachmentPress = useCallback(
    (audioId: string, url: string) => {
      if (probingAudioAttachmentId) setProbingAudioAttachmentId(null);

      if (activeAudioAttachmentId !== audioId) {
        const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(url));
        if (!replaced) return;
        setPendingPlayAudioId(audioId);
        setActiveAudioAttachmentId(audioId);
        return;
      }

      if (previewPlayerStatus.playing) {
        runPreviewPlayerActionSafely(() => previewPlayer.pause());
        return;
      }

      const shouldRestart =
        previewPlayerStatus.didJustFinish ||
        (previewPlayerStatus.duration > 0 &&
          previewPlayerStatus.currentTime >= previewPlayerStatus.duration);
      if (shouldRestart) {
        void previewPlayer.seekTo(0).catch(() => undefined);
      }
      runPreviewPlayerActionSafely(() => previewPlayer.play());
    },
    [
      activeAudioAttachmentId,
      previewPlayer,
      previewPlayerStatus.currentTime,
      previewPlayerStatus.didJustFinish,
      previewPlayerStatus.duration,
      previewPlayerStatus.playing,
      probingAudioAttachmentId,
      runPreviewPlayerActionSafely,
    ],
  );

  return {
    // Audio state
    activeAudioAttachmentId,
    pendingPlayAudioId,
    probingAudioAttachmentId,
    audioDurationById,
    recordingBusy,
    isRecordingAudio,
    recordingMillis,
    previewPlayerStatus,
    previewPlayer,
    recorder,
    setActiveAudioAttachmentId,
    setPendingPlayAudioId,

    // Utilities
    runPreviewPlayerActionSafely,
    isReleasedAudioPlayerError,
    stageRecordedAudioForUpload,
    normalizeLocalFileUri,

    // Actions
    startAudioRecording,
    stopAudioRecording,
    discardAudioRecording,
    handleAudioAttachmentPress,
  };
}
