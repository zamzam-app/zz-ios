import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../api/endpoints/upload';
import { colors, spacing, radius, typography } from '../theme/theme';

interface Props {
  imageUrl?: string;
  folder?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  size?: number;
}

export default function ImagePickerButton({
  imageUrl,
  folder = 'zam-zam',
  onUpload,
  onRemove,
  size = 100,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const pick = async (source: 'library' | 'camera') => {
    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take a photo.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
    }

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(uri, folder);
      onUpload(url);
    } catch {
      Alert.alert('Upload failed', 'Could not upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePress = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Take Photo', onPress: () => pick('camera') },
      { text: 'Choose from Library', onPress: () => pick('library') },
    ];
    if (imageUrl) {
      options.push({ text: 'Remove', style: 'destructive', onPress: onRemove });
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
      {uploading ? (
        <ActivityIndicator color={colors.primary} />
      ) : imageUrl ? (
        <Image source={{ uri: imageUrl }} style={[StyleSheet.absoluteFill, { borderRadius: size / 8 }]} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.icon}>📷</Text>
          <Text style={styles.label}>Add Photo</Text>
        </View>
      )}
      {imageUrl && !uploading && (
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  editBadgeText: { color: '#fff', fontSize: typography.xs, fontWeight: typography.medium },
});
