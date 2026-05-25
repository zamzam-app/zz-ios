import { useMemo, useState } from 'react';
import { Alert } from 'react-native';

import type { Product, Category } from '../../../../api/endpoints/studio';
import {
  useProducts,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../../../../hooks/studio';

export function useStudioState() {
  const {
    data: products,
    isLoading: productsLoading,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useProducts();
  const {
    data: categories,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    refetch: refetchCategories,
  } = useCategories();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCategoryManagerModal, setShowCategoryManagerModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [catalogueSearchQuery, setCatalogueSearchQuery] = useState('');

  const normalizedCatalogueSearch = useMemo(
    () => catalogueSearchQuery.trim().toLowerCase(),
    [catalogueSearchQuery],
  );

  const categoryNameById = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    const base = products ?? [];
    if (!normalizedCatalogueSearch) return base;
    return base.filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedCatalogueSearch) ||
        (p.description ?? '').toLowerCase().includes(normalizedCatalogueSearch),
    );
  }, [products, normalizedCatalogueSearch]);

  const handleProductSubmit = (
    name: string,
    pricingPayload: { quantityValue: number; amount: number }[],
    description: string,
    categoryList: string[],
    images: string[],
  ) => {
    if (!name.trim()) return Alert.alert('Required', 'Cake name is required.');

    if (pricingPayload.length === 0) {
      return Alert.alert('Required', 'At least one valid pricing option is required.');
    }

    for (const row of pricingPayload) {
      if (row.quantityValue <= 0) {
        return Alert.alert('Invalid Input', 'Quantity must be greater than 0 kg.');
      }
      if (row.amount < 0) {
        return Alert.alert('Invalid Input', 'Amount must be greater than or equal to ₹0.');
      }
    }

    if (editingProduct) {
      updateProduct.mutate(
        {
          id: editingProduct.id,
          payload: {
            name: name.trim(),
            pricing: pricingPayload,
            description: description.trim(),
            categoryList,
            images,
          },
        },
        {
          onSuccess: () => setShowProductModal(false),
          onError: () => Alert.alert('Error', 'Failed to update cake.'),
        },
      );
      return;
    }

    createProduct.mutate(
      {
        name: name.trim(),
        pricing: pricingPayload,
        description: description.trim(),
        categoryList,
        images,
      },
      {
        onSuccess: () => setShowProductModal(false),
        onError: () => Alert.alert('Error', 'Failed to create cake.'),
      },
    );
  };

  const handleToggleProductActive = (product: Product, next: boolean) => {
    updateProduct.mutate({ id: product.id, payload: { isActive: next } });
  };

  const handleCategorySubmit = (name: string, description: string) => {
    if (!name.trim()) return Alert.alert('Required', 'Category name is required.');

    if (editingCategory) {
      updateCategory.mutate(
        {
          id: editingCategory.id,
          payload: { name: name.trim(), description: description.trim() || undefined },
        },
        {
          onSuccess: () => setShowCategoryModal(false),
          onError: () => Alert.alert('Error', 'Failed to update category.'),
        },
      );
      return;
    }

    createCategory.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: () => setShowCategoryModal(false),
        onError: () => Alert.alert('Error', 'Failed to create category.'),
      },
    );
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert('Delete', `Delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteProduct.mutate(product.id),
      },
    ]);
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert('Delete', `Delete "${category.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteCategory.mutate(category.id),
      },
    ]);
  };

  const isProductMutating =
    createProduct.isPending || updateProduct.isPending || deleteProduct.isPending;
  const isCategoryMutating =
    createCategory.isPending || updateCategory.isPending || deleteCategory.isPending;

  return {
    products,
    productsLoading,
    productsFetching,
    refetchProducts,
    categories,
    categoriesLoading,
    categoriesFetching,
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
    isProductPending: createProduct.isPending || updateProduct.isPending,
    isCategoryPending: createCategory.isPending || updateCategory.isPending,
  };
}
