import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';

import type { UploadedCakeImage } from '../../../../api/endpoints/uploads';
import { useUploadedCakes } from '../../../../hooks/studio';
import { aiStyles } from '../../../../theme/studioStyles';
import { colors, spacing, radius, typography } from '../../../../theme/theme';

import { AgeRangeFilterSheet } from './AgeRangeFilterSheet';

export function StudioUploadsTab({
  onOpenUploadedCake,
}: {
  onOpenUploadedCake: (item: UploadedCakeImage) => void;
}) {
  const { data: uploadedImages, isLoading } = useUploadedCakes();
  const [searchQuery, setSearchQuery] = useState('');
  const [minAgeText, setMinAgeText] = useState('');
  const [maxAgeText, setMaxAgeText] = useState('');
  const [showAgeFilterModal, setShowAgeFilterModal] = useState(false);

  const minAge = minAgeText.trim().length > 0 ? Number(minAgeText) : undefined;
  const maxAge = maxAgeText.trim().length > 0 ? Number(maxAgeText) : undefined;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredUploads = useMemo(() => {
    const base = uploadedImages ?? [];
    return base.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        (item.name ?? '').toLowerCase().includes(normalizedSearch) ||
        (item.description ?? '').toLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;

      if (minAge === undefined && maxAge === undefined) return true;
      if (!item.dob) return false;

      const dob = new Date(item.dob);
      if (Number.isNaN(dob.getTime())) return false;
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;

      if (minAge !== undefined && age < minAge) return false;
      if (maxAge !== undefined && age > maxAge) return false;
      return true;
    });
  }, [uploadedImages, normalizedSearch, minAge, maxAge]);

  return (
    <View style={styles.uploadsTabRoot}>
      <ScrollView contentContainerStyle={aiStyles.container} keyboardShouldPersistTaps="handled">
        <Text style={aiStyles.sectionTitle}>User Uploaded Images</Text>

        <View style={aiStyles.filtersWrap}>
          <View style={aiStyles.searchRow}>
            <TextInput
              style={aiStyles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search user or description"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={[
                aiStyles.filterIconBtn,
                (minAgeText.trim().length > 0 || maxAgeText.trim().length > 0) &&
                  aiStyles.filterIconBtnActive,
              ]}
              onPress={() => setShowAgeFilterModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={
                  minAgeText.trim().length > 0 || maxAgeText.trim().length > 0
                    ? colors.primaryDark
                    : colors.textSecondary
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={aiStyles.clearBtn}
              onPress={() => {
                setSearchQuery('');
                setMinAgeText('');
                setMaxAgeText('');
              }}
              activeOpacity={0.8}
            >
              <Text style={aiStyles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
          {(minAgeText.trim().length > 0 || maxAgeText.trim().length > 0) && (
            <View style={aiStyles.ageChipRow}>
              <View style={aiStyles.ageChip}>
                <Text
                  style={aiStyles.ageChipText}
                >{`Age: ${minAgeText || 'Any'} - ${maxAgeText || 'Any'}`}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setMinAgeText('');
                    setMaxAgeText('');
                  }}
                  style={aiStyles.ageChipClear}
                >
                  <Text style={aiStyles.ageChipClearText}>x</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : !filteredUploads.length ? (
          <Text style={aiStyles.empty}>No uploaded images yet</Text>
        ) : (
          <View style={styles.uploadGrid}>
            {filteredUploads.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.uploadCard}
                activeOpacity={0.85}
                onPress={() => onOpenUploadedCake(item)}
              >
                <Image
                  source={{ uri: item.referenceImageUrl }}
                  style={styles.uploadImage}
                  resizeMode="cover"
                />
                <View style={styles.uploadMeta}>
                  <Text style={styles.uploadName} numberOfLines={1}>
                    {item.name || 'Unknown User'}
                  </Text>
                  <Text style={styles.uploadDate} numberOfLines={1}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Unknown date'}
                  </Text>
                  {item.description ? (
                    <Text style={styles.uploadDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  {item.dob ? (
                    <Text style={styles.uploadDob} numberOfLines={1}>
                      DOB:{' '}
                      {new Date(item.dob).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <AgeRangeFilterSheet
        visible={showAgeFilterModal}
        minAgeText={minAgeText}
        maxAgeText={maxAgeText}
        setMinAgeText={setMinAgeText}
        setMaxAgeText={setMaxAgeText}
        onClose={() => setShowAgeFilterModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  uploadsTabRoot: {
    flex: 1,
  },
  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  uploadCard: {
    width: '48.5%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  uploadImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceElevated,
  },
  uploadMeta: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  uploadName: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  uploadDate: {
    marginTop: 2,
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  uploadDescription: {
    marginTop: 4,
    fontSize: typography.xs,
    color: colors.text,
  },
  uploadDob: {
    marginTop: 3,
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
});
