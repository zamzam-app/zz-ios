import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Review } from '../../../api/endpoints/reviews';
import { uploadToCloudinary } from '../../../api/endpoints/uploads';
import { useMarkReviewAsRead, useReview, useResolveComplaint } from '../../../hooks/reviews';
import { useForm } from '../../../hooks/tasks';
import { useUsers } from '../../../hooks/useUsers';
import { ReviewsStackParamList } from '../../../navigation/ReviewsNavigator';
import { useAuthStore } from '../../../store/authStore';
import { colors } from '../../../theme/theme';
import { getApiErrorMessage } from '../../../utils/errors';

type Props = NativeStackScreenProps<ReviewsStackParamList, 'ReviewDetail'>;

export interface ComplaintTone {
  label: string;
  text: string;
  bg: string;
  border: string;
}

export function formatDate(iso?: string | null, month: 'short' | 'long' = 'long') {
  if (!iso) return 'Not available';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric' });
}

export function toSentenceCase(status: string) {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getComplaintTone(review: Review): ComplaintTone | null {
  if (!review.isComplaint) return null;

  if (review.complaintStatus === 'resolved') {
    return {
      label: 'Resolved',
      text: colors.success,
      bg: '#ECFDF3',
      border: '#D1FAE5',
    };
  }

  if (review.complaintStatus === 'dismissed') {
    return {
      label: 'Dismissed',
      text: '#B91C1C',
      bg: '#FEE2E2',
      border: '#FECACA',
    };
  }

  return {
    label: 'Pending',
    text: '#B45309',
    bg: '#FEF3C7',
    border: '#FDE68A',
  };
}

export function isLikelyObjectId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value);
}

export function buildAttachmentName(url: string, prefix: string, index: number) {
  const safePrefix = prefix.toLowerCase();
  try {
    const parsed = new URL(url);
    const fileName = parsed.pathname.split('/').pop();
    if (fileName) return decodeURIComponent(fileName);
  } catch {
    // Fallback for non-URL strings.
  }

  const fallbackPart = url.split('/').pop()?.split('?')[0];
  if (fallbackPart) return decodeURIComponent(fallbackPart);

  return `${safePrefix}-${index + 1}`;
}

export function useComplaintResolutionState(
  route: Props['route'],
  navigation: Props['navigation'],
) {
  const { reviewId } = route.params;
  const { data: review, isLoading } = useReview(reviewId);
  const { data: form } = useForm(review?.formId ?? '');
  const { data: users } = useUsers();
  const resolveComplaint = useResolveComplaint();
  const markReviewAsRead = useMarkReviewAsRead();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionAttachments, setResolutionAttachments] = useState<{
    images: string[];
    videos: string[];
    audios: string[];
    files: string[];
  }>({ images: [], videos: [], audios: [], files: [] });
  const [uploadingType, setUploadingType] = useState<
    null | 'images' | 'videos' | 'audios' | 'files'
  >(null);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('ReviewsList');
  };

  const canResolve =
    review?.isComplaint && (review.complaintStatus === 'pending' || !review.complaintStatus);

  const showResolveSection = canResolve && !isAdmin;

  const addAttachmentUrl = (type: 'images' | 'videos' | 'audios' | 'files', url: string) => {
    setResolutionAttachments((prev) => ({
      ...prev,
      [type]: [...prev[type], url],
    }));
  };

  const removeAttachmentUrl = (type: 'images' | 'videos' | 'audios' | 'files', index: number) => {
    setResolutionAttachments((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, idx) => idx !== index),
    }));
  };

  const uploadLocalFile = async (type: 'images' | 'videos' | 'audios' | 'files', uri: string) => {
    setUploadingType(type);
    try {
      const remoteUrl = await uploadToCloudinary(uri, 'reviews');
      addAttachmentUrl(type, remoteUrl);
    } catch (error) {
      Alert.alert('Upload failed', getApiErrorMessage(error, 'Could not upload attachment.'));
    } finally {
      setUploadingType(null);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('images', result.assets[0].uri);
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('videos', result.assets[0].uri);
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('files', result.assets[0].uri);
  };

  const pickVoice = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: false });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    await uploadLocalFile('audios', result.assets[0].uri);
  };

  const handleResolve = () => {
    if (!review || !user) return;
    const resolvedBy = user.id || (user as unknown as { _id?: string })._id;
    if (!resolvedBy) {
      Alert.alert(
        'Unable to resolve complaint',
        'Could not determine resolver identity. Please sign in again.',
      );
      return;
    }

    Alert.alert('Mark as Resolved', 'Are you sure you want to mark this complaint as resolved?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          resolveComplaint.mutate(
            {
              reviewId,
              payload: {
                complaintStatus: 'resolved',
                resolvedBy,
                resolutionNotes: resolutionNotes.trim() || undefined,
                images: resolutionAttachments.images,
                videos: resolutionAttachments.videos,
                audios: resolutionAttachments.audios,
                files: resolutionAttachments.files,
              },
            },
            {
              onError: () => {
                Alert.alert(
                  'Update failed',
                  'Could not update complaint status. Please try again.',
                );
              },
            },
          );
        },
      },
    ]);
  };

  const openAttachment = async (url: string, type?: 'image' | 'video' | 'audio' | 'file') => {
    const trimmedUrl = url.trim();
    const isPdf = trimmedUrl.toLowerCase().split('?')[0].endsWith('.pdf');
    if (isPdf || type === 'file') {
      try {
        const fileName = trimmedUrl.split('/').pop()?.split('?')[0] || `document-${Date.now()}`;
        const localUri = `${FileSystem.cacheDirectory}${fileName}`;

        const downloadRes = await FileSystem.downloadAsync(trimmedUrl, localUri);

        if (downloadRes.status === 200) {
          const sharingAvailable = await Sharing.isAvailableAsync();
          if (sharingAvailable) {
            await Sharing.shareAsync(downloadRes.uri, {
              dialogTitle: isPdf ? 'Open PDF' : 'Open File',
            });
            return;
          }
        }
      } catch (error) {
        console.warn('[ReviewDetail] Failed to open file in-app', error);
      }
    }

    try {
      const canOpen = await Linking.canOpenURL(trimmedUrl);
      if (!canOpen) {
        Alert.alert('Attachment unavailable', 'Could not open this attachment.');
        return;
      }
      await Linking.openURL(trimmedUrl);
    } catch {
      Alert.alert('Attachment unavailable', 'Could not open this attachment.');
    }
  };

  const questionById = useMemo(() => {
    const map = new Map<string, { title: string; type?: string }>();
    for (const question of form?.questions ?? []) {
      map.set(question._id, {
        title: question.title,
        type: question.type,
      });
    }
    return map;
  }, [form?.questions]);

  useEffect(() => {
    const userId = user?.id || user?._id;
    if (!review?.id || !userId) return;
    markReviewAsRead.mutate({ reviewId: review.id, userId });
  }, [markReviewAsRead, review?.id, user?.id, user?._id]);

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const current of users ?? []) {
      if (!current.id) continue;
      if (!current.name) continue;
      map.set(current.id, current.name);
    }
    return map;
  }, [users]);

  const complaintTone = review ? getComplaintTone(review) : null;
  const hasResolution = Boolean(review?.complaintStatus && review.complaintStatus !== 'pending');
  const isMutationPending = resolveComplaint.isPending;

  const resolutionRows: { label: string; value: string }[] = [];
  if (review) {
    resolutionRows.push({
      label: 'Status',
      value: toSentenceCase(review.complaintStatus ?? 'pending'),
    });
    if (review.resolvedAt) {
      resolutionRows.push({
        label: 'Resolved At',
        value: formatDate(review.resolvedAt, 'short'),
      });
    }
    if (review.resolvedBy) {
      const resolvedByName =
        review.resolvedByName ||
        (user && review.resolvedBy === user.id ? user.name : undefined) ||
        userNameById.get(review.resolvedBy) ||
        'Unknown User';
      resolutionRows.push({ label: 'Resolved By', value: resolvedByName });
    }
  }

  return {
    review,
    isLoading,
    form,
    questionById,
    userNameById,
    isAdmin,
    resolutionNotes,
    setResolutionNotes,
    resolutionAttachments,
    uploadingType,
    canResolve,
    showResolveSection,
    hasResolution,
    complaintTone,
    resolutionRows,
    isMutationPending,
    handleBack,
    pickImage,
    pickVideo,
    pickFile,
    pickVoice,
    handleResolve,
    openAttachment,
    removeAttachmentUrl,
  };
}
