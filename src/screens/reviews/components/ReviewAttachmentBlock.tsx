import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';

import { colors, spacing, radius, typography } from '../../../theme/theme';
import { buildAttachmentName } from '../hooks/useComplaintResolutionState';

export function ReviewAttachmentBlock({
  title,
  text,
  attachments,
  onOpenAttachment,
}: {
  title: string;
  text?: string;
  attachments?: {
    images?: string[];
    videos?: string[];
    audios?: string[];
    files?: string[];
  };
  onOpenAttachment: (url: string, type?: 'image' | 'video' | 'audio' | 'file') => void;
}) {
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageRow}
          >
            {imageItems.map((url) => (
              <TouchableOpacity
                key={`${title}-image-${url}`}
                onPress={() => onOpenAttachment(url, 'image')}
                style={styles.imageItem}
                activeOpacity={0.85}
              >
                <Image source={{ uri: url }} style={styles.imageThumb} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
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
            <Ionicons name="videocam-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.attachmentName} numberOfLines={1}>
              {buildAttachmentName(url, 'video', index)}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {audioItems.map((url, index) => (
        <TouchableOpacity
          key={`${title}-audio-${url}`}
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(url, 'audio')}
          activeOpacity={0.8}
        >
          <View style={styles.attachmentRowLeft}>
            <Ionicons name="mic-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.attachmentName} numberOfLines={1}>
              {buildAttachmentName(url, 'audio', index)}
            </Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}

      {fileItems.map((url, index) => (
        <TouchableOpacity
          key={`${title}-file-${url}`}
          style={styles.attachmentRow}
          onPress={() => onOpenAttachment(url, 'file')}
          activeOpacity={0.8}
        >
          <View style={styles.attachmentRowLeft}>
            <Ionicons name="document-outline" size={16} color={colors.primaryDark} />
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
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submissionTitle: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: 4,
  },
  submissionText: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  attachmentGroup: {
    marginTop: spacing.xs,
  },
  attachmentGroupTitle: {
    fontSize: 11,
    fontWeight: typography.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  imageRow: {
    gap: spacing.sm,
  },
  imageItem: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageThumb: {
    width: 80,
    height: 80,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.uiGray0,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  attachmentName: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
});
