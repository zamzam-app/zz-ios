import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CustomCake, UploadedCakeImage } from '../../api/endpoints/uploads';
import { MoreStackParamList } from '../../navigation/MoreNavigator';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

type Props = NativeStackScreenProps<MoreStackParamList, 'StudioDocumentDetail'>;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderCustomCakeBody(item: CustomCake) {
  return (
    <View style={styles.block}>
      <DetailRow label="Document Type" value="Custom Cake" />
      <DetailRow label="Customer" value={item.customerName || 'Unknown'} />
      <DetailRow label="DOB" value={formatDate(item.customerDob)} />
      <DetailRow label="Created" value={formatDate(item.createdAt)} />

      <Text style={styles.sectionTitle}>Prompt</Text>
      <Text style={styles.longText}>{item.prompt || '—'}</Text>
    </View>
  );
}

function renderUploadedCakeBody(item: UploadedCakeImage) {
  return (
    <View style={styles.block}>
      <DetailRow label="Document Type" value="Uploaded Cake" />
      <DetailRow label="Customer" value={item.name || 'Unknown'} />
      <DetailRow label="Phone" value={item.phone || '—'} />
      <DetailRow label="DOB" value={formatDate(item.dob)} />
      <DetailRow label="Created" value={formatDate(item.createdAt)} />

      <Text style={styles.sectionTitle}>Description</Text>
      <Text style={styles.longText}>{item.description || '—'}</Text>
    </View>
  );
}

export default function StudioDocumentDetailScreen({ route, navigation }: Props) {
  const { type, item } = route.params;
  const imageUrl =
    type === 'custom-cake'
      ? (item as CustomCake).imageUrl
      : (item as UploadedCakeImage).referenceImageUrl;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View>
          <Text style={styles.heading}>Studio Document</Text>
          <Text style={styles.subheading}>Full document details</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <Text style={styles.heroFallbackText}>No image</Text>
            </View>
          )}
        </View>

        <View style={styles.detailCard}>
          {type === 'custom-cake'
            ? renderCustomCakeBody(item as CustomCake)
            : renderUploadedCakeBody(item as UploadedCakeImage)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
    backgroundColor: colors.surface,
  },
  heroImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surfaceElevated,
  },
  heroFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackText: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  detailCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...shadow.sm,
  },
  block: {
    gap: spacing.xs,
  },
  detailRow: {
    gap: 2,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: typography.semibold,
  },
  detailValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: typography.semibold,
  },
  longText: {
    marginTop: 3,
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
