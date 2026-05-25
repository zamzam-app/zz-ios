import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../../theme/theme';

import { TaskCategoryFormSheet, TaskCategoryList } from './components';
import { useTaskCategoryCrud } from './hooks/useTaskCategoryCrud';

export default function TaskCategoriesScreen() {
  const ctrl = useTaskCategoryCrud();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <TaskCategoryList
        categories={ctrl.categories}
        isLoading={ctrl.isLoading}
        isFetching={ctrl.isFetching}
        isAdmin={ctrl.isAdmin}
        onRefetch={ctrl.refetch}
        onBack={ctrl.handleBack}
        onCreate={ctrl.handleOpenCreate}
        onEdit={ctrl.handleOpenEdit}
        onDelete={ctrl.handleDelete}
      />

      <TaskCategoryFormSheet
        visible={ctrl.showModal}
        initial={ctrl.editing}
        onClose={ctrl.handleCloseModal}
        onSubmit={ctrl.handleSubmit}
        submitting={ctrl.submitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },
});
