import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoreStackParamList } from '../../navigation/MoreNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import { ManagersList, ManagerEditorSheet } from './managers/components';
import { useManagersState } from './managers/hooks';

export default function ManagersScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  const {
    managers,
    filteredManagers,
    isLoading,
    isFetching,
    refetch,
    query,
    setQuery,
    showCreateModal,
    newName,
    setNewName,
    newUserName,
    setNewUserName,
    newPhone,
    setNewPhone,
    newPassword,
    setNewPassword,
    isEditMode,
    canSaveManager,
    openCreateModal,
    openEditModal,
    closeManagerModal,
    handleToggleActive,
    handleCreateManager,
    handleUpdateManager,
    handleDeleteManager,
    isMutating,
    isCreating,
    isUpdating,
  } = useManagersState();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MoreMenu');
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Managers Directory</Text>
          </View>
          <Text style={styles.subtitle}>High-density administrative control panel</Text>
          {isAdmin ? (
            <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
              <Text style={styles.createBtnText}>+ New Manager</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ManagersList
          managers={managers ?? []}
          filteredManagers={filteredManagers}
          isLoading={isLoading}
          isFetching={isFetching}
          onRefresh={refetch}
          query={query}
          onQueryChange={setQuery}
          onToggleActive={handleToggleActive}
          onDeleteManager={handleDeleteManager}
          onEditManager={openEditModal}
          isMutating={isMutating}
          isAdmin={isAdmin}
        />
      </View>

      <ManagerEditorSheet
        visible={showCreateModal}
        isEditMode={isEditMode}
        newName={newName}
        setNewName={setNewName}
        newUserName={newUserName}
        setNewUserName={setNewUserName}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        onSave={isEditMode ? handleUpdateManager : handleCreateManager}
        onClose={closeManagerModal}
        canSave={canSaveManager}
        isPending={isEditMode ? isUpdating : isCreating}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subtitle: {
    marginTop: 2,
    fontSize: typography.base,
    color: colors.textSecondary,
  },
  createBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.buttonPrimaryBg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontSize: typography.sm,
    fontWeight: typography.semibold,
  },
});
