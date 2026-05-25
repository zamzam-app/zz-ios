import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';
import { buildAttachmentName } from '../hooks/useComplaintResolutionState';

export function ComplaintResolutionForm({
  resolutionNotes,
  setResolutionNotes,
  resolutionAttachments,
  uploadingType,
  pickImage,
  pickVideo,
  pickFile,
  pickVoice,
  handleResolve,
  isMutationPending,
  removeAttachmentUrl,
}: {
  resolutionNotes: string;
  setResolutionNotes: (v: string) => void;
  resolutionAttachments: {
    images: string[];
    videos: string[];
    audios: string[];
    files: string[];
  };
  uploadingType: null | 'images' | 'videos' | 'audios' | 'files';
  pickImage: () => void;
  pickVideo: () => void;
  pickFile: () => void;
  pickVoice: () => void;
  handleResolve: () => void;
  isMutationPending: boolean;
  removeAttachmentUrl: (type: 'images' | 'videos' | 'audios' | 'files', index: number) => void;
}) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeadingWrap}>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTitle}>Resolve Complaint</Text>
        </View>
      </View>

      <View style={styles.managerCard}>
        <TextInput
          style={styles.managerTextInput}
          placeholder="Add resolution notes..."
          placeholderTextColor={colors.textSecondary}
          value={resolutionNotes}
          onChangeText={setResolutionNotes}
          multiline
          textAlignVertical="top"
        />

        <View style={styles.managerActionsRow}>
          <TouchableOpacity
            style={styles.managerActionBtn}
            onPress={pickImage}
            disabled={uploadingType !== null}
          >
            <Ionicons name="image-outline" size={15} color={colors.primaryDark} />
            <Text style={styles.managerActionBtnText}>Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.managerActionBtn}
            onPress={pickVideo}
            disabled={uploadingType !== null}
          >
            <Ionicons name="videocam-outline" size={15} color={colors.primaryDark} />
            <Text style={styles.managerActionBtnText}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.managerActionBtn}
            onPress={pickFile}
            disabled={uploadingType !== null}
          >
            <Ionicons name="document-outline" size={15} color={colors.primaryDark} />
            <Text style={styles.managerActionBtnText}>File</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.managerActionBtn}
            onPress={pickVoice}
            disabled={uploadingType !== null}
          >
            <Ionicons name="mic-outline" size={15} color={colors.primaryDark} />
            <Text style={styles.managerActionBtnText}>Voice</Text>
          </TouchableOpacity>
        </View>

        {uploadingType && (
          <View style={styles.uploadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}>Uploading {uploadingType.slice(0, -1)}...</Text>
          </View>
        )}

        <View style={styles.managerTagGroup}>
          {resolutionAttachments.images.map((url, index) => (
            <TouchableOpacity
              key={`res-image-${url}`}
              style={styles.attachmentTag}
              onLongPress={() => removeAttachmentUrl('images', index)}
            >
              <Text style={styles.attachmentTagText} numberOfLines={1}>
                {buildAttachmentName(url, 'image', index)}
              </Text>
            </TouchableOpacity>
          ))}
          {resolutionAttachments.videos.map((url, index) => (
            <TouchableOpacity
              key={`res-video-${url}`}
              style={styles.attachmentTag}
              onLongPress={() => removeAttachmentUrl('videos', index)}
            >
              <Text style={styles.attachmentTagText} numberOfLines={1}>
                {buildAttachmentName(url, 'video', index)}
              </Text>
            </TouchableOpacity>
          ))}
          {resolutionAttachments.audios.map((url, index) => (
            <TouchableOpacity
              key={`res-audio-${url}`}
              style={styles.attachmentTag}
              onLongPress={() => removeAttachmentUrl('audios', index)}
            >
              <Text style={styles.attachmentTagText} numberOfLines={1}>
                {buildAttachmentName(url, 'audio', index)}
              </Text>
            </TouchableOpacity>
          ))}
          {resolutionAttachments.files.map((url, index) => (
            <TouchableOpacity
              key={`res-file-${url}`}
              style={styles.attachmentTag}
              onLongPress={() => removeAttachmentUrl('files', index)}
            >
              <Text style={styles.attachmentTagText} numberOfLines={1}>
                {buildAttachmentName(url, 'file', index)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.resolveBtnFull, isMutationPending && styles.buttonDisabled]}
          onPress={handleResolve}
          disabled={isMutationPending}
          activeOpacity={0.85}
        >
          {isMutationPending ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={styles.resolveBtnText}>Mark as Resolved</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.accentYellow,
  },
  sectionTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accentBrownText,
    fontWeight: typography.bold,
  },
  managerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha44,
    ...shadow.sm,
  },
  managerTextInput: {
    height: 100,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.uiGray0,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  managerActionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  managerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.buttonLightBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha50,
    gap: 4,
  },
  managerActionBtnText: {
    fontSize: 12,
    fontWeight: typography.semibold,
    color: colors.primaryDark,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  uploadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  managerTagGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  attachmentTag: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 150,
  },
  attachmentTagText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  resolveBtnFull: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  resolveBtnText: {
    color: colors.textInverse,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
