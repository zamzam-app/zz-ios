import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import React from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';

import { colors } from '../../../theme/theme';

interface TaskAttachmentViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function TaskAttachmentViewer({ imageUrl, onClose }: TaskAttachmentViewerProps) {
  return (
    <Modal visible={!!imageUrl} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerRoot}>
        <TouchableOpacity style={styles.viewerCloseBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        {imageUrl ? (
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.viewerImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  viewerRoot: {
    flex: 1,
    backgroundColor: colors.scrimBlack90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  viewerImage: { width: '100%', height: '100%' },
});
