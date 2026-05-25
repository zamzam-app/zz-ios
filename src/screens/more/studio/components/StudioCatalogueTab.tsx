import React from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import type { Product } from '../../../../api/endpoints/studio';
import { aiStyles } from '../../../../theme/studioStyles';
import { colors, spacing } from '../../../../theme/theme';

import { CakeRow } from './CakeRow';

export function StudioCatalogueTab({
  products,
  isLoading,
  isFetching,
  onRefresh,
  searchQuery,
  onSearchChange,
  categoryNameById,
  isAdmin,
  onEditProduct,
  onDeleteProduct,
  onToggleActive,
  isMutating,
}: {
  products: Product[];
  isLoading: boolean;
  isFetching: boolean;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  categoryNameById: Map<string, string>;
  isAdmin: boolean;
  onEditProduct: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
  onToggleActive: (p: Product, next: boolean) => void;
  isMutating: boolean;
}) {
  if (isLoading) {
    return <ActivityIndicator color={colors.primary} style={styles.loader} />;
  }

  return (
    <>
      <View style={[aiStyles.filtersWrap, { marginTop: spacing.md, marginBottom: 0 }]}>
        <View style={aiStyles.searchRow}>
          <TextInput
            style={aiStyles.searchInput}
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search title or description"
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={aiStyles.clearBtn}
              onPress={() => onSearchChange('')}
              activeOpacity={0.8}
            >
              <Text style={aiStyles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList
        style={styles.catalogueList}
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={onRefresh}
        refreshing={isFetching && !isLoading}
        renderItem={({ item }) => {
          const categoryNames = (item.categoryList ?? [])
            .map((id) => categoryNameById.get(id))
            .filter((name): name is string => Boolean(name))
            .slice(0, 2);

          return (
            <CakeRow
              item={item}
              categoryNames={categoryNames}
              isMutating={isMutating}
              isAdmin={isAdmin}
              onToggleActive={(next) => onToggleActive(item, next)}
              onEdit={() => onEditProduct(item)}
              onDelete={() => onDeleteProduct(item)}
            />
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No cakes available yet.</Text>}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: spacing.xl,
  },
  catalogueList: {
    flex: 1,
    marginTop: spacing.md,
  },
  list: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
    paddingBottom: 120,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontSize: 14,
  },
});
