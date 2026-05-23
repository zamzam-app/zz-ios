import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {
  cancelUploadJob,
  enqueueCloudinaryUpload,
  removeUploadJob,
  waitForUploadJob,
} from '../../api/endpoints/uploads';
import { colors, typography } from '../../theme/theme';

interface Props {
  imageUrl?: string;
  folder?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  onUploadStateChange?: (uploading: boolean) => void;
  size?: number;
}

export default function ImagePickerButton({
  imageUrl,
  folder = 'zam-zam',
  onUpload,
  onRemove,
  onUploadStateChange,
  size = 100,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const displayUri = imageUrl ?? localPreviewUri ?? undefined;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setUploadingState = (value: boolean) => {
    if (!isMountedRef.current) return;
    setUploading(value);
    onUploadStateChange?.(value);
  };

  const startBackgroundUpload = async (uri: string) => {
    setUploadingState(true);
    setLocalPreviewUri(uri);
    try {
      const job = await enqueueCloudinaryUpload(uri, folder);
      if (isMountedRef.current) setActiveJobId(job.id);
      const url = await waitForUploadJob(job.id);
      if (!isMountedRef.current) return;
      onUpload(url);
      setLocalPreviewUri(null);
      void removeUploadJob(job.id);
    } catch {
      if (!isMountedRef.current) return;
      Alert.alert('Upload failed', 'Could not upload image. Please try again.');
    } finally {
      if (isMountedRef.current) setActiveJobId(null);
      setUploadingState(false);
    }
  };

  const pick = async (source: 'library' | 'camera') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
      });
    }

    if (result.canceled || !result.assets?.[0]?.uri) return;
    void startBackgroundUpload(result.assets[0].uri);
  };

  const handleRemove = () => {
    if (activeJobId) {
      void cancelUploadJob(activeJobId);
      void removeUploadJob(activeJobId);
      setActiveJobId(null);
    }
    setLocalPreviewUri(null);
    setUploadingState(false);
    onRemove();
  };

  const handlePress = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Take Photo', onPress: () => pick('camera') },
      { text: 'Choose from Library', onPress: () => pick('library') },
    ];
    if (displayUri) {
      options.push({ text: 'Remove', style: 'destructive', onPress: handleRemove });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Image', 'Choose an option', options);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size, borderRadius: size / 8 }]}
      onPress={handlePress}
      disabled={uploading}
      activeOpacity={0.8}
    >
      {displayUri ? (
        <>
          <Image
            source={{ uri: displayUri }}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 8 }]}
            resizeMode="cover"
          />
          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color={colors.textInverse} />
            </View>
          )}
        </>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.icon}>📷</Text>
          <Text style={styles.label}>Add Photo</Text>
        </View>
      )}
      {displayUri && !uploading && (
        <View style={styles.editBadge}>
          <Text style={styles.editBadgeText}>Edit</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  placeholder: { alignItems: 'center', gap: 4 },
  icon: { fontSize: 24 },
  label: { fontSize: typography.xs, color: colors.textSecondary },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.scrimBlack45,
    paddingVertical: 3,
    alignItems: 'center',
  },
  editBadgeText: {
    color: colors.textInverse,
    fontSize: typography.xs,
    fontWeight: typography.medium,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimBlack35,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
