import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import { Form } from '../../../../api/endpoints/forms';
import { colors, spacing, radius, typography, shadow } from '../../../../theme/theme';

export function FormBuilderList({
  forms,
  filteredForms,
  isLoading,
  isFetching,
  onRefresh,
  query,
  onQueryChange,
  onEditForm,
  onDeleteForm,
}: {
  forms: Form[];
  filteredForms: Form[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  query: string;
  onQueryChange: (v: string) => void;
  onEditForm: (id: string) => void;
  onDeleteForm: (form: Form) => void;
}) {
  return (
    <>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          style={styles.searchInput}
          placeholder="Search forms..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.listShell}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Available Forms</Text>
          <View style={styles.totalChip}>
            <Text style={styles.totalChipText}>{forms.length} TOTAL</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={filteredForms}
            keyExtractor={(f) => f.id}
            contentContainerStyle={styles.listContent}
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.title}</Text>
                  <Text style={styles.itemDesc}>
                    {item.questions.length} question{item.questions.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => onEditForm(item.id)}>
                    <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => onDeleteForm(item)}>
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No forms found</Text>}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    justifyContent: 'center',
    marginBottom: spacing.md,
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
    paddingRight: spacing.md,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  listShell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha18,
    padding: spacing.sm,
    ...shadow.sm,
  },
  listHeader: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: typography.xs,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accentBrownText,
    fontWeight: typography.bold,
  },
  totalChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.uiGray4,
  },
  totalChipText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
  },
  listContent: { gap: spacing.sm, paddingBottom: 120 },
  loader: { marginTop: spacing.lg },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha18,
  },
  itemName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  itemDesc: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.lg },
});
