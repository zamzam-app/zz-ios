import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';
import { formatDuration } from '../hooks/useTaskAttachmentUploads';

interface TaskAttachmentComposerProps {
  showAttachmentMenu: boolean;
  isRecordingAudio: boolean;
  recordingMillis: number | null;
  recordingBusy: boolean;
  onToggleMenu: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickVideo: () => void;
  onPickFile: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDiscardRecording: () => void;
}

export function TaskAttachmentComposer({
  showAttachmentMenu,
  isRecordingAudio,
  recordingMillis,
  recordingBusy,
  onToggleMenu,
  onTakePhoto,
  onPickImage,
  onPickVideo,
  onPickFile,
  onStartRecording,
  onStopRecording,
  onDiscardRecording,
}: TaskAttachmentComposerProps) {
  return (
    <View style={styles.attachmentSection}>
      <View style={styles.attachmentHeaderRow}>
        <Text style={styles.attachmentTitle}>ATTACHMENTS</Text>
        <View style={styles.attachmentHeaderActions}>
          <TouchableOpacity
            style={styles.attachmentHeaderIconButton}
            onPress={onToggleMenu}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="paperclip" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.attachmentHeaderIconButton,
              isRecordingAudio && styles.attachmentHeaderIconButtonActive,
            ]}
            onPress={() => {
              if (isRecordingAudio) {
                onStopRecording();
              } else {
                onStartRecording();
              }
            }}
            activeOpacity={0.85}
            disabled={recordingBusy}
          >
            <MaterialCommunityIcons
              name={isRecordingAudio ? 'record-circle' : 'microphone-outline'}
              size={18}
              color={isRecordingAudio ? colors.error : colors.primary}
            />
          </TouchableOpacity>
          {isRecordingAudio && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.recordingTimerText}>{formatDuration(recordingMillis ?? 0)}</Text>
              <TouchableOpacity
                style={styles.attachmentHeaderIconButton}
                onPress={onDiscardRecording}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {showAttachmentMenu && (
        <View style={styles.attachmentInlineDropdown}>
          <TouchableOpacity style={styles.attachmentInlineDropdownItem} onPress={onTakePhoto}>
            <View style={styles.attachmentInlineDropdownIconBox}>
              <MaterialCommunityIcons name="camera-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.attachmentInlineDropdownText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachmentInlineDropdownItem} onPress={onPickImage}>
            <View style={styles.attachmentInlineDropdownIconBox}>
              <MaterialCommunityIcons name="image-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.attachmentInlineDropdownText}>Image</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachmentInlineDropdownItem} onPress={onPickVideo}>
            <View style={styles.attachmentInlineDropdownIconBox}>
              <MaterialCommunityIcons name="video-outline" size={18} color={colors.primary} />
            </View>
            <Text style={styles.attachmentInlineDropdownText}>Video</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachmentInlineDropdownItem} onPress={onPickFile}>
            <View style={styles.attachmentInlineDropdownIconBox}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <Text style={styles.attachmentInlineDropdownText}>File</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  attachmentSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: spacing.sm,
    position: 'relative',
    overflow: 'visible',
  },
  attachmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  attachmentTitle: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    letterSpacing: 0.4,
  },
  attachmentHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attachmentHeaderIconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentHeaderIconButtonActive: {
    borderColor: colors.error,
    backgroundColor: colors.errorLight,
  },
  recordingTimerText: {
    color: colors.error,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    minWidth: 48,
    textAlign: 'right',
  },
  attachmentInlineDropdown: {
    position: 'absolute',
    right: spacing.sm,
    top: 46,
    width: 170,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    zIndex: 20,
    elevation: 6,
  },
  attachmentInlineDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  attachmentInlineDropdownIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  attachmentInlineDropdownText: {
    color: colors.text,
    fontSize: typography.sm,
    fontWeight: typography.medium,
  },
});
