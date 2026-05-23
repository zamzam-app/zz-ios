import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Review, UserResponse } from '../../api/endpoints/reviews';
import { uploadToCloudinary } from '../../api/endpoints/upload';
import StarRating from '../../components/StarRating';
import { useForm } from '../../hooks/useForms';
import { useMarkReviewAsRead, useReview, useResolveComplaint } from '../../hooks/useReviews';
import { useUsers } from '../../hooks/useUsers';
import { ReviewsStackParamList } from '../../navigation/ReviewsNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { getApiErrorMessage } from '../../utils/errors';

type Props = NativeStackScreenProps<ReviewsStackParamList, 'ReviewDetail'>;
const COMPLAINT_LABEL_WIDTH = 86;

interface ComplaintTone {
  label: string;
  text: string;
  bg: string;
  border: string;
}

function formatDate(iso?: string | null, month: 'short' | 'long' = 'long') {
  if (!iso) return 'Not available';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric' });
}

function toSentenceCase(status: string) {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function Row({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function getComplaintTone(review: Review): ComplaintTone | null {
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

function isLikelyObjectId(value: string) {
  return /^[a-f0-9]{24}$/i.test(value);
}

function ResponseItem({
  response,
  isLast,
  questionTitle,
  questionType,
}: {
  response: UserResponse;
  isLast: boolean;
  questionTitle: string;
  questionType?: string;
}) {
  const renderAnswer = () => {
    const answer = response.answer;
    if (questionType === 'rating' && typeof answer === 'number') {
      return <StarRating rating={answer} size={14} />;
    }
    if (Array.isArray(answer)) {
      return (
        <View style={styles.answerList}>
          {answer.map((a) => (
            <Text key={`${questionTitle}-${String(a)}`} style={styles.answerText}>
              · {a}
            </Text>
          ))}
        </View>
      );
    }
    return <Text style={styles.answerText}>{String(answer)}</Text>;
  };

  return (
    <View style={[styles.responseItem, isLast && styles.responseItemLast]}>
      <Text style={styles.questionTitle}>{questionTitle}</Text>
      {renderAnswer()}
    </View>
  );
}

function buildAttachmentName(url: string, prefix: string, index: number) {
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

function SubmissionBlock({
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

function SectionHeader({ title, count }: { title: string; count?: number | string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingWrap}>
        <View style={styles.sectionDot} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {count !== undefined && count !== null ? (
        <Text style={styles.sectionCount}>{count}</Text>
      ) : null}
    </View>
  );
}

export default function ReviewDetailScreen({ route, navigation }: Props) {
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
    // Handle PDF and other files specifically to open in-app
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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Review not found</Text>
      </View>
    );
  }

  const complaintTone = getComplaintTone(review);
  const hasResolution = Boolean(review.complaintStatus && review.complaintStatus !== 'pending');
  const isMutationPending = resolveComplaint.isPending;

  const resolutionRows: { label: string; value: string }[] = [
    { label: 'Status', value: toSentenceCase(review.complaintStatus ?? 'pending') },
  ];

  if (review.resolvedAt) {
    resolutionRows.push({ label: 'Resolved At', value: formatDate(review.resolvedAt, 'short') });
  }

  if (review.resolvedBy) {
    const resolvedByName =
      review.resolvedByName ||
      (user && review.resolvedBy === user.id ? user.name : undefined) ||
      userNameById.get(review.resolvedBy) ||
      'Unknown User';
    resolutionRows.push({ label: 'Resolved By', value: resolvedByName });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headingWrap}>
            <Text style={styles.heading}>Review Details</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.topRow}>
            <Text style={styles.summaryTitle} numberOfLines={1}>
              {isAdmin ? review.customerName : 'Customer'}
            </Text>
            <View style={styles.ratingWrap}>
              <StarRating rating={review.overallRating} size={14} />
              <Text style={styles.ratingText}>{review.overallRating.toFixed(1)} / 5.0</Text>
            </View>
          </View>

          <Text style={styles.summaryOutlet}>{review.outletName}</Text>
          {isAdmin && review.customerPhone && (
            <Text
              style={styles.summaryPhone}
              onPress={() => Linking.openURL(`tel:${review.customerPhone}`)}
            >
              <Ionicons name="call-outline" size={12} color={colors.textSecondary} />{' '}
              {review.customerPhone}
            </Text>
          )}
          <Text style={styles.summaryMeta}>Submitted on {formatDate(review.createdAt)}</Text>
          <View style={styles.summaryStatusRow}>
            <Text style={styles.summaryStatusLabel}>Status:</Text>
            {complaintTone ? (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: complaintTone.bg, borderColor: complaintTone.border },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: complaintTone.text }]}>
                  {complaintTone.label}
                </Text>
              </View>
            ) : (
              <View style={styles.feedbackBadge}>
                <Text style={styles.feedbackBadgeText}>Feedback</Text>
              </View>
            )}
          </View>
        </View>

        {review.userResponses.length > 0 && (
          <>
            <SectionHeader title="Responses" />
            <View style={styles.responsesCard}>
              {review.userResponses.map((response, index) => {
                const questionRef =
                  typeof response.questionId === 'object' && response.questionId
                    ? response.questionId
                    : null;
                const questionId =
                  typeof response.questionId === 'string' ? response.questionId : questionRef?._id;
                const fallbackQuestion = questionId ? questionById.get(questionId) : undefined;
                const mappedTitle = questionRef?.title?.trim() || fallbackQuestion?.title?.trim();
                const inlineStringQuestion =
                  typeof response.questionId === 'string' && !isLikelyObjectId(response.questionId)
                    ? response.questionId.trim()
                    : '';
                const questionTitle =
                  mappedTitle || inlineStringQuestion || `Question ${index + 1}`;
                const questionType = questionRef?.type ?? fallbackQuestion?.type;

                return (
                  <ResponseItem
                    key={String(response.questionId)}
                    response={response}
                    isLast={index === review.userResponses.length - 1}
                    questionTitle={questionTitle}
                    questionType={questionType}
                  />
                );
              })}
            </View>
          </>
        )}
        {review.isComplaint && review.complaintReason && (
          <>
            <SectionHeader title="Complaint Box" />
            <View style={[styles.card, styles.complaintCard]}>
              <View style={styles.inlineComplaintRow}>
                <Text style={[styles.complaintLabel, styles.complaintLabelCol]}>Complaint:</Text>
                <Text style={styles.complaintReasonInline}>{review.complaintReason}</Text>
              </View>
            </View>
          </>
        )}

        {showResolveSection && (
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
                  <Text style={styles.uploadingText}>
                    Uploading {uploadingType.slice(0, -1)}...
                  </Text>
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
        )}

        {hasResolution && (
          <>
            <SectionHeader title="Resolution" />
            <View style={styles.card}>
              {resolutionRows.map((item, index) => (
                <Row
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  isLast={
                    index === resolutionRows.length - 1 &&
                    !review.resolutionNotes &&
                    !review.resolutionAttachments
                  }
                />
              ))}

              {review.resolutionNotes ? (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesValue}>{review.resolutionNotes}</Text>
                </View>
              ) : null}

              {review.resolutionAttachments && (
                <SubmissionBlock
                  title="Resolution Attachments"
                  attachments={review.resolutionAttachments}
                  onOpenAttachment={openAttachment}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: 120 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingWrap: {
    flex: 1,
  },
  heading: {
    fontSize: 26,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha25,
    ...shadow.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  feedbackBadge: {
    borderRadius: radius.full,
    backgroundColor: colors.uiGray0,
    borderWidth: 1,
    borderColor: colors.uiSlate200,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  feedbackBadgeText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  ratingWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: typography.bold,
  },
  summaryTitle: {
    fontSize: typography.lg,
    color: colors.text,
    fontWeight: typography.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  summaryOutlet: {
    marginTop: spacing.xs,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.primary,
    marginBottom: 2,
  },
  summaryPhone: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMeta: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  summaryStatusRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryStatusLabel: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.semibold,
  },
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
  sectionCount: {
    minWidth: 22,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.uiGray4,
    color: colors.text,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: typography.bold,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  responsesCard: {
    backgroundColor: colors.surface,
    borderRadius: 36,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha44,
    ...shadow.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  rowLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  rowValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },

  responseItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  responseItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  questionTitle: {
    fontSize: typography.lg,
    color: colors.text,
    fontWeight: typography.bold,
  },
  answerList: {
    gap: 4,
  },
  answerText: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 19,
  },

  complaintCard: {
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha44,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.sm,
  },
  complaintLabel: {
    fontSize: typography.base,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  complaintLabelCol: {
    width: COMPLAINT_LABEL_WIDTH,
  },
  inlineComplaintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  complaintReasonInline: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
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

  notesBlock: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  notesLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  notesValue: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
