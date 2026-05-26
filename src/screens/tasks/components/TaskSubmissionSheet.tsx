import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';
import { formatDuration } from '../hooks/useTaskAudioController';

import { SubmissionBlock } from './SubmissionBlock';

interface TaskSubmissionSheetProps {
  visible: boolean;
  onClose: () => void;

  // Text
  managerText: string;
  onManagerTextChange: (text: string) => void;

  // Recording
  isRecordingAudio: boolean;
  recordingMillis: number;
  recordingBusy: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onDiscardRecording: () => Promise<void>;

  // Media picking
  uploadingType: string | null;
  onTakePhoto: () => Promise<void>;
  onPickImage: () => Promise<void>;
  onPickVideo: () => Promise<void>;
  onPickFile: () => Promise<void>;

  // Attachments
  managerAttachments: {
    images: string[];
    videos: string[];
    audios: string[];
    files: string[];
  };
  onRemoveAttachment: (type: 'images' | 'videos' | 'audios' | 'files', index: number) => void;
  onOpenAttachment: (url: string, type?: 'image' | 'video' | 'audio' | 'file') => void;

  // Audio playback
  sourceAttachmentsAudioMeta: { id: string; url: string }[];
  previewPlayerStatus: {
    playing: boolean;
    currentTime: number;
    duration: number;
    didJustFinish: boolean;
  };
  activeAudioAttachmentId: string | null;
  audioDurationById: Record<string, number>;
  onAudioPress: (id: string, url: string) => void;

  // Save
  onSave: () => Promise<void>;
  isSavingAttachments: boolean;
  isSavingComment: boolean;
}

export function TaskSubmissionSheet({
  visible,
  onClose,
  managerText,
  onManagerTextChange,
  isRecordingAudio,
  recordingMillis,
  recordingBusy,
  onStartRecording,
  onStopRecording,
  onDiscardRecording,
  uploadingType,
  onTakePhoto,
  onPickImage,
  onPickVideo,
  onPickFile,
  managerAttachments,
  onRemoveAttachment,
  onOpenAttachment,
  sourceAttachmentsAudioMeta,
  previewPlayerStatus,
  activeAudioAttachmentId,
  audioDurationById,
  onAudioPress,
  onSave,
  isSavingAttachments,
  isSavingComment,
}: TaskSubmissionSheetProps) {
  const hasAttachments =
    managerAttachments.images.length > 0 ||
    managerAttachments.videos.length > 0 ||
    managerAttachments.audios.length > 0 ||
    managerAttachments.files.length > 0;

  const isSaving = isSavingAttachments || isSavingComment;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.submissionModalRoot}
      >
        <TouchableOpacity activeOpacity={1} style={styles.submissionModalScrim} onPress={onClose} />
        <View style={styles.submissionSheet}>
          <View style={styles.editSheetTop}>
            <View style={styles.editSheetHandle} />
            <View style={styles.editSheetHeader}>
              <Text style={styles.editSheetTitle}>Add Attachment</Text>
              <TouchableOpacity style={styles.editSheetClose} onPress={onClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.submissionModalScroll}
            contentContainerStyle={styles.submissionModalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              style={styles.managerTextInput}
              placeholder="Add notes..."
              placeholderTextColor={colors.textSecondary}
              value={managerText}
              onChangeText={onManagerTextChange}
              multiline
              textAlignVertical="top"
            />

            {isRecordingAudio ? (
              <View style={styles.recordingRow}>
                <View style={styles.recordingTimerWrap}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingTimerText}>{formatDuration(recordingMillis)}</Text>
                </View>
                <View style={styles.recordingActions}>
                  <TouchableOpacity
                    style={styles.recordingActionBtn}
                    onPress={onDiscardRecording}
                    disabled={recordingBusy}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.recordingActionBtn, styles.stopRecordingBtn]}
                    onPress={onStopRecording}
                    disabled={recordingBusy}
                  >
                    <Ionicons name="stop" size={18} color={colors.textInverse} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.managerActionsRow}>
                <TouchableOpacity
                  style={styles.managerActionBtn}
                  onPress={onTakePhoto}
                  disabled={uploadingType !== null || recordingBusy}
                >
                  <Ionicons name="camera-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.managerActionBtn}
                  onPress={onPickImage}
                  disabled={uploadingType !== null || recordingBusy}
                >
                  <Ionicons name="image-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>Image</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.managerActionBtn}
                  onPress={onPickVideo}
                  disabled={uploadingType !== null || recordingBusy}
                >
                  <Ionicons name="videocam-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>Video</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.managerActionBtn}
                  onPress={onPickFile}
                  disabled={uploadingType !== null || recordingBusy}
                >
                  <Ionicons name="document-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>File</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.managerActionBtn}
                  onPress={onStartRecording}
                  disabled={uploadingType !== null || recordingBusy}
                >
                  <Ionicons name="mic-outline" size={15} color={colors.primaryDark} />
                  <Text style={styles.managerActionBtnText}>Voice</Text>
                </TouchableOpacity>
              </View>
            )}

            {uploadingType && (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.uploadingText}>Uploading {uploadingType.slice(0, -1)}...</Text>
              </View>
            )}

            {hasAttachments && (
              <SubmissionBlock
                title="Attached"
                text={undefined}
                attachments={managerAttachments}
                onOpenAttachment={(url, type) => {
                  void onOpenAttachment(url, type);
                }}
                onRemoveAttachment={onRemoveAttachment}
                audioAttachmentMeta={sourceAttachmentsAudioMeta}
                audioPlayerStatus={previewPlayerStatus}
                activeAudioAttachmentId={activeAudioAttachmentId}
                audioDurationById={audioDurationById}
                onAudioPress={onAudioPress}
              />
            )}

            <TouchableOpacity
              style={[styles.saveManagerBtn, isSaving && styles.iconActionBtnDisabled]}
              onPress={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.textInverse} size="small" />
              ) : (
                <Text style={styles.saveManagerBtnText}>Add Attachment</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  submissionModalRoot: { flex: 1, justifyContent: 'flex-end' },
  submissionModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimBlack45,
  },
  submissionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  editSheetTop: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  editSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.uiGray4,
    marginBottom: 12,
  },
  editSheetHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editSheetTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  editSheetClose: { padding: 4 },
  submissionModalScroll: { flexGrow: 0 },
  submissionModalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: spacing.md,
  },
  managerTextInput: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  managerActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  managerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  managerActionBtnText: {
    fontSize: typography.xs,
    color: colors.primaryDark,
    fontWeight: '600' as const,
  },
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  uploadingText: { fontSize: typography.xs, color: colors.textSecondary },
  saveManagerBtn: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPrimaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  saveManagerBtnText: {
    fontSize: typography.sm,
    color: colors.textInverse,
    fontWeight: '700' as const,
  },
  iconActionBtnDisabled: { opacity: 0.6 },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  recordingTimerWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  recordingDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.error },
  recordingTimerText: {
    fontSize: typography.md,
    color: colors.error,
    fontWeight: '700' as const,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recordingActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recordingActionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopRecordingBtn: { backgroundColor: colors.error, borderColor: colors.error },
});
