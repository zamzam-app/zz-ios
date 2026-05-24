import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { MoreStackParamList } from '../../navigation/MoreNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

import {
  StudioCatalogueTab,
  StudioAiOrdersTab,
  StudioUploadsTab,
  ProductFormSheet,
  CategoryFormSheet,
  CategoryManagerSheet,
} from './studio/components';
import { useStudioState } from './studio/hooks';

type StudioNav = NativeStackNavigationProp<MoreStackParamList, 'Studio'>;
type StudioTab = 'catalogue' | 'ai' | 'uploads';

export default function StudioScreen() {
  const navigation = useNavigation<StudioNav>();
  const [activeTab, setActiveTab] = useState<StudioTab>('catalogue');
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  const {
    productsFetching,
    productsLoading,
    categories,
    categoriesFetching,
    categoriesLoading,
    refetchProducts,
    refetchCategories,
    showProductModal,
    setShowProductModal,
    showCategoryModal,
    setShowCategoryModal,
    showCategoryManagerModal,
    setShowCategoryManagerModal,
    editingProduct,
    setEditingProduct,
    editingCategory,
    setEditingCategory,
    catalogueSearchQuery,
    setCatalogueSearchQuery,
    filteredProducts,
    categoryNameById,
    handleProductSubmit,
    handleToggleProductActive,
    handleCategorySubmit,
    handleDeleteProduct,
    handleDeleteCategory,
    isProductMutating,
    isCategoryMutating,
    isProductPending,
    isCategoryPending,
  } = useStudioState();

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
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.heading}>Studio</Text>
              <Text style={styles.subheading}>Organize and curate your bakery storefront.</Text>
            </View>
          </View>

          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setShowCategoryManagerModal(true)}
            >
              <Text style={styles.secondaryBtnText}>Category</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => {
                  setEditingProduct(undefined);
                  setShowProductModal(true);
                }}
              >
                <Text style={styles.createBtnText}>+ New Cake</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'catalogue' && styles.tabActive]}
            onPress={() => setActiveTab('catalogue')}
          >
            <Ionicons
              name="book-outline"
              size={16}
              color={activeTab === 'catalogue' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'catalogue' && styles.tabTextActive]}>
              Catalogue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
            onPress={() => setActiveTab('ai')}
          >
            <Ionicons
              name="sparkles-outline"
              size={16}
              color={activeTab === 'ai' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
              AI Studio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'uploads' && styles.tabActive]}
            onPress={() => setActiveTab('uploads')}
          >
            <Ionicons
              name="images-outline"
              size={16}
              color={activeTab === 'uploads' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'uploads' && styles.tabTextActive]}>
              Uploads
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'ai' ? (
          <StudioAiOrdersTab
            onOpenCustomCake={(item) =>
              navigation.navigate('StudioDocumentDetail', {
                type: 'custom-cake',
                item,
              })
            }
          />
        ) : activeTab === 'uploads' ? (
          <StudioUploadsTab
            onOpenUploadedCake={(item) =>
              navigation.navigate('StudioDocumentDetail', {
                type: 'uploaded-cake',
                item,
              })
            }
          />
        ) : (
          <StudioCatalogueTab
            products={filteredProducts}
            isLoading={productsLoading}
            isFetching={productsFetching}
            onRefresh={refetchProducts}
            searchQuery={catalogueSearchQuery}
            onSearchChange={setCatalogueSearchQuery}
            categoryNameById={categoryNameById}
            isAdmin={isAdmin}
            onEditProduct={(p) => {
              setEditingProduct(p);
              setShowProductModal(true);
            }}
            onDeleteProduct={handleDeleteProduct}
            onToggleActive={handleToggleProductActive}
            isMutating={isProductMutating}
          />
        )}
      </View>

      <ProductFormSheet
        visible={showProductModal}
        initial={editingProduct}
        categories={categories ?? []}
        onClose={() => setShowProductModal(false)}
        onSubmit={handleProductSubmit}
        submitting={isProductPending}
      />

      <CategoryFormSheet
        visible={showCategoryModal}
        initial={editingCategory}
        onClose={() => setShowCategoryModal(false)}
        onSubmit={handleCategorySubmit}
        submitting={isCategoryPending}
      />

      <CategoryManagerSheet
        visible={showCategoryManagerModal}
        categories={categories ?? []}
        isLoading={categoriesLoading}
        isFetching={categoriesFetching}
        onRefresh={refetchCategories}
        isAdmin={isAdmin}
        onClose={() => setShowCategoryManagerModal(false)}
        onNewCategory={() => {
          setEditingCategory(undefined);
          setShowCategoryModal(true);
        }}
        onEditCategory={(c) => {
          setEditingCategory(c);
          setShowCategoryModal(true);
        }}
        onDeleteCategory={handleDeleteCategory}
        isMutating={isCategoryMutating}
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  createBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPrimaryBg,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.md,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.semibold,
  },
});
