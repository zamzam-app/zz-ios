import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { Task } from '../../../api/endpoints/tasks';
import { colors, spacing, radius, typography } from '../../../theme/theme';
import {
  AttachmentType,
  getTaskAttachmentUrls,
  buildAttachmentName,
} from '../hooks/useTasksBoardState';

interface TaskAttachmentsSheetProps {
  visible: boolean;
  attachmentModal: { task: Task; type: AttachmentType } | null;
  resolvedAttachments?: { id: string; url: string }[] | null;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
  onOpenExternal: (url: string, type?: AttachmentType) => void;
  onRemove?: (id: string) => void;
}

export function TaskAttachmentsSheet({
  visible,
  attachmentModal,
  resolvedAttachments,
  isLoading,
  error,
  onClose,
  onOpenExternal,
  onRemove,
}: TaskAttachmentsSheetProps) {
  // If resolvedAttachments is loaded, use it to get exact URLs and IDs.
  // Otherwise, fallback to the URLs on the task object (without IDs).
  const renderItems = resolvedAttachments
    ? resolvedAttachments
    : attachmentModal
      ? getTaskAttachmentUrls(attachmentModal.task, attachmentModal.type).map((url) => ({
          id: undefined,
          url,
        }))
      : [];

  const attachmentModalTitle = attachmentModal
    ? attachmentModal.type === 'images'
      ? 'Image Attachments'
      : attachmentModal.type === 'videos'
        ? 'Video Attachments'
        : attachmentModal.type === 'audios'
          ? 'Audio Attachments'
          : 'File Attachments'
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.attachModalRoot}>
        <TouchableOpacity style={styles.attachModalScrim} activeOpacity={1} onPress={onClose} />
        <View style={styles.attachModalCard}>
          <View style={styles.attachModalHeader}>
            <Text style={styles.attachModalTitle}>{attachmentModalTitle}</Text>
            <TouchableOpacity onPress={onClose} style={styles.attachModalCloseBtn}>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={styles.attachModalInfoRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.attachModalInfoText}>Loading attachment details...</Text>
            </View>
          )}

          {error && (
            <View style={styles.attachModalErrorRow}>
              <Ionicons name="warning-outline" size={16} color={colors.error} />
              <Text style={styles.attachModalErrorText}>{error}</Text>
            </View>
          )}

          <ScrollView contentContainerStyle={styles.attachModalContent}>
            {attachmentModal?.type === 'images'
              ? renderItems.map((item, index) => (
                  <View key={item.id ?? `${item.url}-${index}`} style={styles.attachImageWrap}>
                    <TouchableOpacity
                      onPress={() => {
                        onOpenExternal(item.url, attachmentModal?.type);
                      }}
                      activeOpacity={0.84}
                      style={styles.attachImageItem}
                    >
                      <Image
                        source={{ uri: item.url }}
                        style={styles.attachImageThumb}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    {onRemove && item.id && (
                      <TouchableOpacity
                        style={styles.attachDeleteBtnOverlay}
                        onPress={() => {
                          Alert.alert(
                            'Delete Attachment',
                            'Are you sure you want to remove this attachment?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => onRemove(item.id as string),
                              },
                            ],
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="trash-outline" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              : renderItems.map((item, index) => (
                  <View key={item.id ?? `${item.url}-${index}`} style={styles.attachRow}>
                    <TouchableOpacity
                      style={styles.attachRowLeft}
                      onPress={() => {
                        onOpenExternal(item.url, attachmentModal?.type);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={
                          attachmentModal?.type === 'videos'
                            ? 'videocam-outline'
                            : attachmentModal?.type === 'audios'
                              ? 'mic-outline'
                              : 'document-outline'
                        }
                        size={16}
                        color={colors.primaryDark}
                      />
                      <Text style={styles.attachRowText} numberOfLines={1}>
                        {buildAttachmentName(item.url, attachmentModal?.type ?? 'file', index)}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.attachRowActions}>
                      <TouchableOpacity
                        onPress={() => {
                          onOpenExternal(item.url, attachmentModal?.type);
                        }}
                        style={styles.attachRowActionBtn}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                      {onRemove && item.id && (
                        <TouchableOpacity
                          style={styles.attachRowActionBtn}
                          onPress={() => {
                            Alert.alert(
                              'Delete Attachment',
                              'Are you sure you want to remove this attachment?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                  text: 'Delete',
                                  style: 'destructive',
                                  onPress: () => onRemove(item.id as string),
                                },
                              ],
                            );
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  attachModalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  attachModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayBlack33,
  },
  attachModalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '72%',
    overflow: 'hidden',
  },
  attachModalHeader: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attachModalTitle: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  attachModalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray3,
  },
  attachModalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.uiGray1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  attachModalInfoText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  attachModalErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.errorLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  attachModalErrorText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.error,
  },
  attachModalContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  attachImageItem: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachImageThumb: {
    width: '100%',
    height: 180,
  },
  attachImageWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  attachRow: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  attachRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingRight: 4,
  },
  attachRowActionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachDeleteBtnOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: `${colors.error}D9`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.whiteAlpha50,
  },

  attachRowText: { flex: 1, fontSize: typography.sm, color: colors.text },
});
