import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import OutletTypeFormSheet from './components/OutletTypeFormSheet';
import OutletTypeList from './components/OutletTypeList';
import { useOutletTypeCrud } from './hooks/useOutletTypeCrud';

export default function OutletTypesScreen() {
  const {
    types,
    isLoading,
    isFetching,
    refetch,
    isAdmin,
    isPending,
    showModal,
    setShowModal,
    editing,
    setEditing,
    handleBack,
    handleSubmit,
    handleDelete,
  } = useOutletTypeCrud();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headingWrap}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.heading}>Outlet Types</Text>
          </View>
          <Text style={styles.subheading}>Manage foundational categories for your outlets</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              setEditing(undefined);
              setShowModal(true);
            }}
          >
            <Text style={styles.createBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <OutletTypeList
        types={types}
        isLoading={isLoading}
        isFetching={isFetching}
        refetch={refetch}
        isAdmin={isAdmin}
        onEdit={(type) => {
          setEditing(type);
          setShowModal(true);
        }}
        onDelete={handleDelete}
      />

      <OutletTypeFormSheet
        visible={showModal}
        initial={editing}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        submitting={isPending}
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
    gap: spacing.sm,
  },
  headingWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: -spacing.xs,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
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
});
