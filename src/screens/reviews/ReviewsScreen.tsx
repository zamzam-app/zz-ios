import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReviewsStackParamList } from '../../navigation/ReviewsNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import { AllReviewsSection } from './components/AllReviewsSection';
import { CriticalFeedbackSection } from './components/CriticalFeedbackSection';
import { HeatmapSection } from './components/HeatmapSection';
import { OutletSelectorSheet } from './components/OutletSelectorSheet';
import { ReviewsAnalyticsSection } from './components/ReviewsAnalyticsSection';
import { ReviewsFilterSheet } from './components/ReviewsFilterSheet';
import { useReviewsFilterState } from './hooks/useReviewsFilterState';

type Props = NativeStackScreenProps<ReviewsStackParamList, 'ReviewsList'>;

export default function ReviewsScreen({ route }: Props) {
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  const {
    selectedOutletId,
    setSelectedOutletId,
    statusFilter,
    setStatusFilter,
    allReviewsFilter,
    setAllReviewsFilter,
    searchQuery,
    setSearchQuery,
    showFilterModal,
    setShowFilterModal,
    showOutletModal,
    setShowOutletModal,
    ranking,
    outletOptions,
    criticalFeed,
    pendingCount,
    hasUnresolvedComplaint,
    displayedAllReviews,
    heatmapRowsWithFallback,
    isReviewsLoading,
    isCriticalReviewsLoading,
    isAnalyticsLoading,
    refreshing,
    activeStatusFilterLabel,
    allReviewsEmptyMessage,
    showOutletFilter,
    handleRefresh,
  } = useReviewsFilterState(route);

  const selectedOutletLabel =
    outletOptions.find((opt: { id: string }) => opt.id === selectedOutletId)?.label ||
    'All Outlets';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing && !isReviewsLoading} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.heading}>Reviews & Performance</Text>
            <Text style={styles.subheading}>
              Real-time franchise health and sentiment analysis.
            </Text>
          </View>

          <TouchableOpacity style={styles.exportButton} activeOpacity={0.8}>
            <Ionicons name="download-outline" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionStack}>
          <ReviewsAnalyticsSection ranking={ranking} isLoading={isAnalyticsLoading} />

          <View style={styles.sectionBlock}>
            <HeatmapSection
              heatmapRowsWithFallback={heatmapRowsWithFallback}
              selectedOutletId={selectedOutletId}
              onOutletSelect={showOutletFilter ? () => setShowOutletModal(true) : undefined}
              selectedOutletLabel={selectedOutletLabel}
              isLoading={isAnalyticsLoading}
            />
          </View>
        </View>

        {statusFilter !== 'all' && (
          <View style={styles.activeFilterRow}>
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterText}>Filter: {activeStatusFilterLabel}</Text>
              <TouchableOpacity
                onPress={() => setStatusFilter('all')}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Clear review status filter"
                style={styles.activeFilterClearBtn}
              >
                <Ionicons name="close" size={14} color={colors.primaryDark} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {hasUnresolvedComplaint && (
          <CriticalFeedbackSection
            criticalFeed={criticalFeed}
            pendingCount={pendingCount}
            isAdmin={isAdmin}
            isLoading={isReviewsLoading || isCriticalReviewsLoading}
          />
        )}

        <AllReviewsSection
          displayedAllReviews={displayedAllReviews}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          allReviewsFilter={allReviewsFilter}
          setAllReviewsFilter={setAllReviewsFilter}
          isAdmin={isAdmin}
          setShowFilterModal={setShowFilterModal}
          isLoading={isReviewsLoading}
          allReviewsEmptyMessage={allReviewsEmptyMessage}
        />
      </ScrollView>

      <ReviewsFilterSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        allReviewsFilter={allReviewsFilter}
        setAllReviewsFilter={setAllReviewsFilter}
      />

      {showOutletFilter && (
        <OutletSelectorSheet
          visible={showOutletModal}
          onClose={() => setShowOutletModal(false)}
          outletOptions={outletOptions}
          selectedOutletId={selectedOutletId}
          onSelectOutlet={(id: string, isAll: boolean) => {
            setSelectedOutletId(id);
            if (isAll) {
              setStatusFilter('all');
              setAllReviewsFilter('all');
            }
            setShowOutletModal(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.md,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  exportButton: {
    backgroundColor: colors.buttonPrimaryBg,
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  sectionStack: {
    gap: spacing.md,
  },
  sectionBlock: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  activeFilterRow: {
    paddingHorizontal: spacing.xs,
  },
  activeFilterChip: {
    alignSelf: 'flex-start',
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintStrong,
    paddingLeft: spacing.sm,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterText: {
    fontSize: typography.xs,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  activeFilterClearBtn: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.whiteAlpha50,
  },
});
