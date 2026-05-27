import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';

import {
  cancelUploadJob,
  enqueueCloudinaryUpload,
  removeUploadJob,
} from '../../../api/endpoints/uploads/uploadQueueApi';
import { waitForUploadJob } from '../../../api/endpoints/uploads/uploadQueueSubscriptions';

type AttachmentType = 'image' | 'video' | 'audio' | 'file';

export interface AttachmentItem {
  id: string;
  type: AttachmentType;
  name: string;
  uri: string;
  status: 'uploading' | 'uploaded' | 'failed';
  uploadJobId?: string;
  remoteUrl?: string;
  error?: string;
  durationMillis?: number;
}

function getAttachmentIcon(type: AttachmentType): string {
  if (type === 'image') return 'image-outline';
  if (type === 'video') return 'video-outline';
  if (type === 'audio') return 'microphone-outline';
  return 'file-outline';
}

function isReleasedAudioPlayerError(error: unknown) {
  return (
    error instanceof Error &&
    /already released|cannot be cast to type expo\.modules\.audio\.AudioPlayer|NativeSharedObjectNotFoundException/i.test(
      error.message,
    )
  );
}

const WAVEFORM_BARS = [6, 10, 14, 8, 16, 7, 13, 9, 15, 6, 12, 10, 14, 7, 11, 9];
const AUDIO_FILE_WAIT_RETRIES = 25;
const AUDIO_FILE_WAIT_DELAY_MS = 120;

function normalizeLocalFileUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('file://')) {
    return trimmed;
  }
  if (trimmed.startsWith('file:/')) {
    const pathOnly = trimmed.replace(/^file:\/*/, '/');
    return `file://${pathOnly}`;
  }
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  return trimmed;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export { WAVEFORM_BARS, formatDuration, getAttachmentIcon, isReleasedAudioPlayerError };
export type { AttachmentType };

export function useTaskAttachmentUploads() {
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<string | null>(null);
  const [activeAudioAttachmentId, setActiveAudioAttachmentId] = useState<string | null>(null);
  const [pendingPlayAudioId, setPendingPlayAudioId] = useState<string | null>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const previewPlayer = useAudioPlayer(null, { updateInterval: 150 });
  const previewPlayerStatus = useAudioPlayerStatus(previewPlayer);
  const isRecordingAudio = recorderState.isRecording;
  const recordingMillis = recorderState.durationMillis;

  const runPreviewPlayerActionSafely = useCallback((action: () => unknown): boolean => {
    try {
      const result = action();
      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        (result as Promise<unknown>).catch((error) => {
          if (!isReleasedAudioPlayerError(error)) {
            console.warn('[CreateTask] Preview player action failed', error);
          }
        });
      }
      return true;
    } catch (error) {
      if (!isReleasedAudioPlayerError(error)) {
        console.warn('[CreateTask] Preview player action failed', error);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, [previewPlayer, runPreviewPlayerActionSafely]);

  useEffect(() => {
    if (!previewAttachmentId) return;
    if (!attachments.some((item) => item.id === previewAttachmentId)) {
      setPreviewAttachmentId(null);
    }
  }, [attachments, previewAttachmentId]);

  useEffect(() => {
    if (!activeAudioAttachmentId) return;
    const stillExists = attachments.some(
      (item) => item.id === activeAudioAttachmentId && item.type === 'audio',
    );
    if (!stillExists) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      setActiveAudioAttachmentId(null);
      setPendingPlayAudioId(null);
    }
  }, [attachments, activeAudioAttachmentId, previewPlayer, runPreviewPlayerActionSafely]);

  useEffect(() => {
    if (previewPlayerStatus.didJustFinish) {
      setActiveAudioAttachmentId(null);
    }
  }, [previewPlayerStatus.didJustFinish]);

  // On iOS, replace() loads the source asynchronously. Play only once isLoaded is true.
  useEffect(() => {
    if (!pendingPlayAudioId || !previewPlayerStatus.isLoaded) return;
    runPreviewPlayerActionSafely(() => previewPlayer.play());
    setPendingPlayAudioId(null);
  }, [
    pendingPlayAudioId,
    previewPlayerStatus.isLoaded,
    previewPlayer,
    runPreviewPlayerActionSafely,
  ]);

  const waitForRecordedAudioFile = async (uri: string): Promise<number> => {
    for (let attempt = 0; attempt < AUDIO_FILE_WAIT_RETRIES; attempt += 1) {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && !info.isDirectory && info.size > 0) {
        return info.size;
      }
      await new Promise((resolve) => setTimeout(resolve, AUDIO_FILE_WAIT_DELAY_MS));
    }
    const finalInfo = await FileSystem.getInfoAsync(uri);
    if (finalInfo.exists && !finalInfo.isDirectory) {
      return finalInfo.size;
    }
    return 0;
  };

  const stageRecordedAudioForUpload = async (uri: string): Promise<string> => {
    const normalizedUri = normalizeLocalFileUri(uri);
    const recordedSize = await waitForRecordedAudioFile(normalizedUri);
    if (recordedSize <= 0) {
      throw new Error('Recorded audio file is unavailable.');
    }
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

  const saveRecordedAudioAttachment = async (uri: string, duration: number): Promise<boolean> => {
    const normalizedDuration = Math.max(0, duration);
    try {
      const uploadUri = await stageRecordedAudioForUpload(uri);
      addAttachment('audio', uploadUri, `Voice note ${formatDuration(normalizedDuration)}`, {
        durationMillis: normalizedDuration,
      });
      return true;
    } catch {
      Alert.alert(
        'Error',
        'Could not prepare the recorded audio for upload. Please try recording again.',
      );
      return false;
    }
  };

  const startAttachmentUpload = async (attachmentId: string, uri: string) => {
    try {
      const job = await enqueueCloudinaryUpload(uri, 'tasks');
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === attachmentId
            ? { ...item, uploadJobId: job.id, status: 'uploading', error: undefined }
            : item,
        ),
      );

      const remoteUrl = await waitForUploadJob(job.id);
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === attachmentId
            ? { ...item, status: 'uploaded', remoteUrl, error: undefined }
            : item,
        ),
      );
    } catch (error) {
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === attachmentId
            ? {
                ...item,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : item,
        ),
      );
    }
  };

  const addAttachment = (
    type: AttachmentType,
    uri: string,
    name: string,
    extra: Partial<Pick<AttachmentItem, 'durationMillis'>> = {},
  ) => {
    const attachmentId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setAttachments((prev) => [
      ...prev,
      {
        id: attachmentId,
        type,
        uri,
        name,
        status: 'uploading',
        ...extra,
      },
    ]);
    void startAttachmentUpload(attachmentId, uri);
  };

  const removeAttachment = (id: string) => {
    if (activeAudioAttachmentId === id) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
      setActiveAudioAttachmentId(null);
    }
    if (previewAttachmentId === id) {
      setPreviewAttachmentId(null);
    }
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.uploadJobId) {
        void cancelUploadJob(target.uploadJobId);
        void removeUploadJob(target.uploadJobId);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const setExistingAttachments = useCallback((existingAttachments: AttachmentItem[]) => {
    setAttachments(existingAttachments);
  }, []);

  const pickMedia = async (kind: 'image' | 'video') => {
    setShowAttachmentMenu(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Media library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'image' ? 'images' : 'videos',
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const picked = result.assets[0];
    const fallbackName = `${kind}-${attachments.length + 1}`;
    addAttachment(kind, picked.uri, picked.fileName ?? fallbackName);
  };

  const takePhoto = async () => {
    setShowAttachmentMenu(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const picked = result.assets[0];
    const fallbackName = `photo-${attachments.length + 1}.jpg`;
    addAttachment('image', picked.uri, picked.fileName ?? fallbackName);
  };

  const pickFile = async () => {
    setShowAttachmentMenu(false);
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: '*/*',
    });
    if (result.canceled || !result.assets?.length) return;
    result.assets.forEach((asset) => {
      addAttachment('file', asset.uri, asset.name);
    });
  };

  const startAudioRecording = async () => {
    if (recordingBusy || isRecordingAudio) return;
    setRecordingBusy(true);
    setShowAttachmentMenu(false);
    runPreviewPlayerActionSafely(() => previewPlayer.pause());
    setActiveAudioAttachmentId(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Microphone access is required to record audio.');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('Error', 'Could not start recording. Please try again.');
    } finally {
      setRecordingBusy(false);
    }
  };

  const stopAudioRecording = async () => {
    if (recordingBusy || !isRecordingAudio) return;
    setRecordingBusy(true);
    try {
      const durationBeforeStop = Math.max(0, recordingMillis ?? 0);
      await recorder.stop();
      const status = recorder.getStatus();
      const uri = status.url || recorder.uri || null;
      if (uri) {
        const duration = Math.max(0, durationBeforeStop, status.durationMillis ?? 0);
        const saved = await saveRecordedAudioAttachment(uri, duration);
        if (!saved) return;
      }
    } catch {
      const fallbackStatus = recorder.getStatus();
      const fallbackUri = fallbackStatus.url || recorder.uri || null;
      const fallbackDuration = Math.max(
        0,
        recordingMillis ?? 0,
        fallbackStatus.durationMillis ?? 0,
      );
      if (fallbackUri) {
        const saved = await saveRecordedAudioAttachment(fallbackUri, fallbackDuration);
        if (saved) return;
      }
      Alert.alert('Error', 'Could not stop recording. Please try again.');
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        () => undefined,
      );
      setRecordingBusy(false);
    }
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

  const handleAudioAttachmentPress = (item: AttachmentItem) => {
    if (activeAudioAttachmentId !== item.id) {
      const replaced = runPreviewPlayerActionSafely(() => previewPlayer.replace(item.uri));
      if (!replaced) return;
      setPendingPlayAudioId(item.id);
      setActiveAudioAttachmentId(item.id);
      setPreviewAttachmentId(item.id);
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
    setPreviewAttachmentId(item.id);
  };

  const openAttachmentExternally = async (item: AttachmentItem) => {
    const previewUrl = item.remoteUrl ?? item.uri;
    if (!item.remoteUrl) {
      Alert.alert(
        'Still uploading',
        'This attachment is still being uploaded. Please wait for it to complete.',
      );
      return;
    }
    try {
      if (item.type === 'file') {
        await WebBrowser.openBrowserAsync(previewUrl);
        return;
      }
      // Video/audio: open via Linking (matches TaskDetailScreen timeline behavior)
      const canOpen = await Linking.canOpenURL(previewUrl);
      if (!canOpen) {
        Alert.alert('Cannot open file', 'This file type is not supported on this device.');
        return;
      }
      await Linking.openURL(previewUrl);
    } catch (error) {
      console.error(
        '[CreateTask] Failed to open attachment:',
        error instanceof Error ? error.message : String(error),
      );
      Alert.alert('Attachment unavailable', 'Could not open this attachment.');
    }
  };

  const handleAttachmentPress = (item: AttachmentItem) => {
    setShowAttachmentMenu(false);
    if (item.type === 'audio') {
      handleAudioAttachmentPress(item);
      return;
    }
    if (item.type === 'image') {
      if (!item.remoteUrl) {
        Alert.alert(
          'Still uploading',
          'This image is still being uploaded. Please wait for it to complete.',
        );
        return;
      }
      if (previewPlayerStatus.playing) {
        runPreviewPlayerActionSafely(() => previewPlayer.pause());
      }
      setActiveAudioAttachmentId(null);
      setPreviewAttachmentId(null);
      setViewerImageUrl(item.remoteUrl);
      return;
    }
    if (item.type === 'video' || item.type === 'file') {
      if (previewPlayerStatus.playing) {
        runPreviewPlayerActionSafely(() => previewPlayer.pause());
      }
      setActiveAudioAttachmentId(null);
      setPreviewAttachmentId(null);
      void openAttachmentExternally(item);
      return;
    }
    if (previewPlayerStatus.playing) {
      runPreviewPlayerActionSafely(() => previewPlayer.pause());
    }
    setActiveAudioAttachmentId(null);
    setPreviewAttachmentId((prev) => (prev === item.id ? null : item.id));
  };

  return {
    // Attachment state
    showAttachmentMenu,
    setShowAttachmentMenu,
    attachments,
    previewAttachmentId,
    activeAudioAttachmentId,
    previewPlayerStatus,
    previewPlayer,

    // Recording state
    isRecordingAudio,
    recordingMillis,
    recordingBusy,

    // WAVEFORM_BARS
    WAVEFORM_BARS: WAVEFORM_BARS as number[],
    WAVEFORM_BAR_SPECS: WAVEFORM_BARS.map((height, i) => ({
      id: `wave_${i}`,
      height,
    })),

    // Image viewer
    viewerImageUrl,
    setViewerImageUrl,

    // Actions
    addAttachment,
    removeAttachment,
    setExistingAttachments,
    pickMedia,
    takePhoto,
    pickFile,
    startAudioRecording,
    stopAudioRecording,
    discardAudioRecording,
    handleAttachmentPress,
    handleAudioAttachmentPress,
    openAttachmentExternally,
  };
}
