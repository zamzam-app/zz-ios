import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Outlet } from '../../api/endpoints/outlets';
import { useOutlets } from '../../hooks/infrastructure';
import { InfrastructureStackParamList } from '../../navigation/InfrastructureNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import OutletCard from './components/OutletCard';
import OutletEditorSheet from './components/OutletEditorSheet';
import OutletQrSheet from './components/OutletQrSheet';
import { useOutletListState } from './hooks/useOutletListState';
import { useOutletQrActions } from './hooks/useOutletQrActions';

type Nav = NativeStackNavigationProp<InfrastructureStackParamList, 'OutletsList'>;

export default function InfrastructureScreen() {
  const navigation = useNavigation<Nav>();
  const { data: outlets, isLoading, isFetching, refetch } = useOutlets();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  const { searchQuery, setSearchQuery, screenModel, handleDelete } = useOutletListState(outlets);

  const {
    selectedQrOutlet,
    setSelectedQrOutlet,
    qrRef,
    handleOpenQrModal,
    handleDownloadQr,
    handleOpenReviewUrl,
  } = useOutletQrActions();

  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingOutlet, setEditingOutlet] = React.useState<Outlet | null>(null);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Outlets</Text>
          <Text style={styles.subheading}>Manage your restaurant locations</Text>
        </View>

        <View style={styles.headerBtns}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('OutletTypes')}
            >
              <Text style={styles.secondaryBtnText}>Type</Text>
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
              <Text style={styles.createBtnText}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholder={screenModel.searchPlaceholder}
            placeholderTextColor={colors.textSecondary}
          />
          {screenModel.showClearSearch && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.searchClearBtn}
              onPress={() => setSearchQuery('')}
              activeOpacity={0.7}
            >
              <Text style={styles.searchClearText}>x</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
      ) : (
        <FlatList
          data={screenModel.visibleOutlets}
          keyExtractor={(o) => o.id}
          contentContainerStyle={[
            styles.list,
            screenModel.visibleOutlets.length === 0 && styles.listEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <OutletCard
              outlet={item}
              isAdmin={isAdmin}
              onPress={() => navigation.navigate('OutletDetail', { outletId: item.id })}
              onQrPress={() => handleOpenQrModal(item)}
              onEditPress={() => setEditingOutlet(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.empty}>{screenModel.emptyMessage}</Text>
              {screenModel.showClearSearch ? (
                <Text style={styles.emptyHint}>
                  Try a different outlet name, location, or identifier.
                </Text>
              ) : null}
            </View>
          }
        />
      )}

      <OutletEditorSheet
        visible={showCreateModal}
        mode="create"
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          void refetch();
        }}
      />

      <OutletEditorSheet
        visible={editingOutlet !== null}
        mode="edit"
        outlet={editingOutlet}
        onClose={() => setEditingOutlet(null)}
        onSuccess={() => {
          setEditingOutlet(null);
          void refetch();
        }}
      />

      <OutletQrSheet
        visible={selectedQrOutlet !== null}
        outlet={selectedQrOutlet}
        qrRef={qrRef}
        onClose={() => setSelectedQrOutlet(null)}
        onDownload={handleDownloadQr}
        onOpenReviewUrl={handleOpenReviewUrl}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },

  headerBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlsRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  searchWrap: {
    justifyContent: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  searchInput: {
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 38,
    paddingRight: 34,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  searchClearBtn: {
    position: 'absolute',
    right: 8,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray4,
  },
  searchClearText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.bold,
    lineHeight: 16,
    includeFontPadding: false,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha50,
    backgroundColor: colors.buttonLightBg,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  createBtn: {
    backgroundColor: colors.buttonPrimaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },

  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: 120 },
  listEmpty: { flexGrow: 1 },

  empty: {
    marginTop: spacing.sm,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },
  emptyState: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyHint: {
    marginTop: spacing.xs,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
});
