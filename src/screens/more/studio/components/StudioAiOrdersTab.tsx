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
} from 'react-native';

import type { CustomCake } from '../../../../api/endpoints/uploads';
import { useCustomCakes } from '../../../../hooks/studio';
import { aiStyles } from '../../../../theme/studioStyles';
import { colors, spacing } from '../../../../theme/theme';

import { AgeRangeFilterSheet } from './AgeRangeFilterSheet';

export function StudioAiOrdersTab({
  onOpenCustomCake,
}: {
  onOpenCustomCake: (item: CustomCake) => void;
}) {
  const { data: savedCakes, isLoading: cakesLoading } = useCustomCakes();
  const [searchQuery, setSearchQuery] = useState('');
  const [minAgeText, setMinAgeText] = useState('');
  const [maxAgeText, setMaxAgeText] = useState('');
  const [showAgeFilterModal, setShowAgeFilterModal] = useState(false);

  const minAge = minAgeText.trim().length > 0 ? Number(minAgeText) : undefined;
  const maxAge = maxAgeText.trim().length > 0 ? Number(maxAgeText) : undefined;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredCakes = useMemo(() => {
    const base = savedCakes ?? [];
    return base.filter((cake) => {
      const matchesSearch =
        !normalizedSearch ||
        cake.prompt.toLowerCase().includes(normalizedSearch) ||
        (cake.customerName ?? '').toLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;

      if (minAge === undefined && maxAge === undefined) return true;
      if (!cake.customerDob) return false;

      const dob = new Date(cake.customerDob);
      if (Number.isNaN(dob.getTime())) return false;
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;

      if (minAge !== undefined && age < minAge) return false;
      if (maxAge !== undefined && age > maxAge) return false;
      return true;
    });
  }, [savedCakes, normalizedSearch, minAge, maxAge]);

  return (
    <ScrollView contentContainerStyle={aiStyles.container} keyboardShouldPersistTaps="handled">
      <Text style={aiStyles.sectionTitle}>Customer Cake Orders</Text>
      <View style={aiStyles.filtersWrap}>
        <View style={aiStyles.searchRow}>
          <TextInput
            style={aiStyles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search description or customer name"
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
      {cakesLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : !filteredCakes.length ? (
        <Text style={aiStyles.empty}>No custom cake orders yet</Text>
      ) : (
        filteredCakes.map((cake) => (
          <TouchableOpacity
            key={cake.id}
            style={aiStyles.cakeCard}
            activeOpacity={0.86}
            onPress={() => onOpenCustomCake(cake)}
          >
            {cake.imageUrl ? (
              <Image
                source={{ uri: cake.imageUrl }}
                style={aiStyles.cakeThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[aiStyles.cakeThumbnail, aiStyles.cakeThumbnailFallback]}>
                <Text style={{ fontSize: 24 }}>🎂</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={aiStyles.cakePrompt} numberOfLines={2}>
                {cake.prompt}
              </Text>
              {cake.customerName ? (
                <Text style={aiStyles.cakeCustomer} numberOfLines={1}>
                  {cake.customerName}
                </Text>
              ) : null}
              <Text style={aiStyles.cakeDate}>
                {new Date(cake.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <AgeRangeFilterSheet
        visible={showAgeFilterModal}
        minAgeText={minAgeText}
        maxAgeText={maxAgeText}
        setMinAgeText={setMinAgeText}
        setMaxAgeText={setMaxAgeText}
        onClose={() => setShowAgeFilterModal(false)}
      />
    </ScrollView>
  );
}
