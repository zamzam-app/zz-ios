import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useProducts,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCustomCakes,
  useUploadedCakes,
} from '../../hooks/useProducts';
import { Product, Category } from '../../api/endpoints/products';
import ImagePickerButton from '../../components/ImagePickerButton';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import type { MoreStackParamList } from '../../navigation/MoreNavigator';

type StudioNav = NativeStackNavigationProp<MoreStackParamList, 'Studio'>;
type StudioTab = 'catalogue' | 'ai' | 'uploads';

function CategoryModal({ visible, initial, onClose, onSubmit, submitting }: {
  visible: boolean;
  initial?: Category;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setDesc(initial?.description ?? '');
    }
  }, [visible, initial]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalHeaderCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{initial ? 'Edit Category' : 'New Category'}</Text>
          <TouchableOpacity onPress={() => onSubmit(name, desc)} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={colors.primary} />
              : <Text style={styles.modalHeaderSave}>Save</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.formInner}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Category name"
            placeholderTextColor={colors.textDisabled}
          />
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={desc}
            onChangeText={setDesc}
            placeholder="Optional description"
            placeholderTextColor={colors.textDisabled}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ProductModal({ visible, initial, categories, onClose, onSubmit, submitting }: {
  visible: boolean;
  initial?: Product;
  categories: Category[];
  onClose: () => void;
  onSubmit: (name: string, price: string, description: string, categoryList: string[], images: string[]) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setPrice(initial?.price?.toString() ?? '');
      setDescription(initial?.description ?? '');
      setSelectedCats(initial?.categoryList ?? []);
      setImageUrl(initial?.images?.[0] ?? '');
      setImageUploading(false);
    }
  }, [visible, initial]);

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalHeaderCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{initial ? 'Edit Cake' : 'New Cake'}</Text>
            <TouchableOpacity
              onPress={() => onSubmit(name, price, description, selectedCats, imageUrl ? [imageUrl] : [])}
              disabled={submitting || imageUploading}
            >
              {(submitting || imageUploading)
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={styles.modalHeaderSave}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formInner} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Photo</Text>
            <ImagePickerButton
              imageUrl={imageUrl || undefined}
              folder="products"
              onUpload={setImageUrl}
              onRemove={() => setImageUrl('')}
              onUploadStateChange={setImageUploading}
              size={110}
            />

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Cake name"
              placeholderTextColor={colors.textDisabled}
            />

            <Text style={styles.label}>Price *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={colors.textDisabled}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Cake description"
              placeholderTextColor={colors.textDisabled}
              multiline
            />

            {categories.length > 0 ? (
              <>
                <Text style={styles.label}>Categories</Text>
                <View style={styles.chipRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.chip, selectedCats.includes(cat.id) && styles.chipActive]}
                      onPress={() => toggleCat(cat.id)}
                    >
                      <Text style={[styles.chipText, selectedCats.includes(cat.id) && styles.chipTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AIStudioTab() {
  const { data: savedCakes, isLoading: cakesLoading } = useCustomCakes();

  return (
    <ScrollView contentContainerStyle={aiStyles.container} keyboardShouldPersistTaps="handled">
      <Text style={aiStyles.sectionTitle}>Customer Cake Orders</Text>
      {cakesLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : !savedCakes?.length ? (
        <Text style={aiStyles.empty}>No custom cake orders yet</Text>
      ) : (
        savedCakes.map((cake) => (
          <View key={cake.id} style={aiStyles.cakeCard}>
            {cake.imageUrl ? (
              <Image source={{ uri: cake.imageUrl }} style={aiStyles.cakeThumbnail} resizeMode="cover" />
            ) : (
              <View style={[aiStyles.cakeThumbnail, aiStyles.cakeThumbnailFallback]}>
                <Text style={{ fontSize: 24 }}>🎂</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={aiStyles.cakePrompt} numberOfLines={2}>{cake.prompt}</Text>
              <Text style={aiStyles.cakeDate}>
                {new Date(cake.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function UploadedImagesTab({ onOpenPreview }: { onOpenPreview: (url: string) => void }) {
  const { data: uploadedImages, isLoading } = useUploadedCakes();

  return (
    <View style={styles.uploadsTabRoot}>
      <ScrollView contentContainerStyle={aiStyles.container} keyboardShouldPersistTaps="handled">
        <Text style={aiStyles.sectionTitle}>User Uploaded Images</Text>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : !uploadedImages?.length ? (
          <Text style={aiStyles.empty}>No uploaded images yet</Text>
        ) : (
          <View style={styles.uploadGrid}>
            {uploadedImages.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.uploadCard}
                activeOpacity={0.85}
                onPress={() => onOpenPreview(item.referenceImageUrl)}
              >
                <Image source={{ uri: item.referenceImageUrl }} style={styles.uploadImage} resizeMode="cover" />
                <View style={styles.uploadMeta}>
                  <Text style={styles.uploadName} numberOfLines={1}>{item.name || 'Unknown User'}</Text>
                  <Text style={styles.uploadDate} numberOfLines={1}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                      : 'Unknown date'}
                  </Text>
                  {item.description ? (
                    <Text style={styles.uploadDescription} numberOfLines={2}>{item.description}</Text>
                  ) : null}
                  {item.dob ? (
                    <Text style={styles.uploadDob} numberOfLines={1}>
                      DOB: {new Date(item.dob).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function CakeRow({
  item,
  categoryNames,
  onEdit,
  onDelete,
  onToggleActive,
  isMutating,
}: {
  item: Product;
  categoryNames: string[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (next: boolean) => void;
  isMutating: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardMainRow}>
        <View style={styles.productThumbWrap}>
          {item.images?.[0] ? (
            <Image source={{ uri: item.images[0] }} style={styles.productThumb} resizeMode="cover" />
          ) : (
            <View style={[styles.productThumb, styles.productThumbFallback]}>
              <Text style={{ fontSize: 20 }}>🍰</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
          </View>

          {item.description ? <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text> : null}

          {categoryNames.length > 0 ? (
            <View style={styles.metaChipRow}>
              {categoryNames.map((name) => (
                <View key={`${item.id}-${name}`} style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{name}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Switch
          value={item.isActive}
          onValueChange={onToggleActive}
          disabled={isMutating}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.textInverse}
        />
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onEdit} disabled={isMutating}>
            <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={onDelete} disabled={isMutating}>
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function StudioScreen() {
  const navigation = useNavigation<StudioNav>();
  const [activeTab, setActiveTab] = useState<StudioTab>('catalogue');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: products, isLoading: productsLoading, isFetching: productsFetching, refetch: refetchProducts } = useProducts();
  const { data: categories, isLoading: categoriesLoading, isFetching: categoriesFetching, refetch: refetchCategories } = useCategories();

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

  const categoryNameById = useMemo(
    () => new Map((categories ?? []).map((category) => [category.id, category.name])),
    [categories],
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MoreMenu');
  };

  const handleProductSubmit = (
    name: string,
    price: string,
    description: string,
    categoryList: string[],
    images: string[],
  ) => {
    if (!name.trim()) return Alert.alert('Required', 'Cake name is required.');
    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice)) return Alert.alert('Invalid', 'Please enter a valid price.');

    if (editingProduct) {
      updateProduct.mutate(
        {
          id: editingProduct.id,
          payload: {
            name: name.trim(),
            price: parsedPrice,
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
      { name: name.trim(), price: parsedPrice, description: description.trim(), categoryList, images },
      {
        onSuccess: () => setShowProductModal(false),
        onError: () => Alert.alert('Error', 'Failed to create cake.'),
      },
    );
  };

  const handleCategorySubmit = (name: string, description: string) => {
    if (!name.trim()) return Alert.alert('Required', 'Category name is required.');

    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, payload: { name: name.trim(), description: description.trim() || undefined } },
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

  const isProductMutating = createProduct.isPending || updateProduct.isPending || deleteProduct.isPending;
  const isCategoryMutating = createCategory.isPending || updateCategory.isPending || deleteCategory.isPending;

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
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowCategoryManagerModal(true)}>
              <Text style={styles.secondaryBtnText}>Category</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                setEditingProduct(undefined);
                setShowProductModal(true);
              }}
            >
              <Text style={styles.createBtnText}>+ New Cake</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'catalogue' && styles.tabActive]}
            onPress={() => setActiveTab('catalogue')}
          >
            <Ionicons name="book-outline" size={16} color={activeTab === 'catalogue' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'catalogue' && styles.tabTextActive]}>Catalogue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ai' && styles.tabActive]}
            onPress={() => setActiveTab('ai')}
          >
            <Ionicons name="sparkles-outline" size={16} color={activeTab === 'ai' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>AI Studio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'uploads' && styles.tabActive]}
            onPress={() => setActiveTab('uploads')}
          >
            <Ionicons name="images-outline" size={16} color={activeTab === 'uploads' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'uploads' && styles.tabTextActive]}>Uploads</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'ai' ? (
          <AIStudioTab />
        ) : activeTab === 'uploads' ? (
          <UploadedImagesTab onOpenPreview={setPreviewUrl} />
        ) : (
          productsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              style={styles.catalogueList}
              data={products ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              onRefresh={refetchProducts}
              refreshing={productsFetching && !productsLoading}
              renderItem={({ item }) => {
                const categoryNames = (item.categoryList ?? [])
                  .map((id) => categoryNameById.get(id))
                  .filter((name): name is string => Boolean(name))
                  .slice(0, 2);

                return (
                  <CakeRow
                    item={item}
                    categoryNames={categoryNames}
                    isMutating={isProductMutating}
                    onToggleActive={(next) => updateProduct.mutate({ id: item.id, payload: { isActive: next } })}
                    onEdit={() => {
                      setEditingProduct(item);
                      setShowProductModal(true);
                    }}
                    onDelete={() => handleDeleteProduct(item)}
                  />
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No cakes available yet.</Text>}
            />
          )
        )}
      </View>

      <ProductModal
        visible={showProductModal}
        initial={editingProduct}
        categories={categories ?? []}
        onClose={() => setShowProductModal(false)}
        onSubmit={handleProductSubmit}
        submitting={createProduct.isPending || updateProduct.isPending}
      />

      <CategoryModal
        visible={showCategoryModal}
        initial={editingCategory}
        onClose={() => setShowCategoryModal(false)}
        onSubmit={handleCategorySubmit}
        submitting={createCategory.isPending || updateCategory.isPending}
      />

      <Modal
        visible={showCategoryManagerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryManagerModal(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCategoryManagerModal(false)}>
              <Text style={styles.modalHeaderCancel}>Done</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Categories</Text>
            <TouchableOpacity
              onPress={() => {
                setEditingCategory(undefined);
                setShowCategoryModal(true);
              }}
            >
              <Text style={styles.modalHeaderSave}>+ New</Text>
            </TouchableOpacity>
          </View>

          {categoriesLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={categories ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.categoryList}
              onRefresh={refetchCategories}
              refreshing={categoriesFetching && !categoriesLoading}
              renderItem={({ item }) => (
                <View style={styles.categoryRow}>
                  <View style={styles.categoryRowContent}>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    {item.description ? <Text style={styles.categoryDesc}>{item.description}</Text> : null}
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => {
                        setEditingCategory(item);
                        setShowCategoryModal(true);
                      }}
                      disabled={isCategoryMutating}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleDeleteCategory(item)}
                      disabled={isCategoryMutating}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No categories yet.</Text>}
            />
          )}
        </SafeAreaView>
      </Modal>

      {previewUrl ? (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.uploadPreviewOverlay}
          onPress={() => setPreviewUrl(null)}
        >
          <Image source={{ uri: previewUrl }} style={styles.uploadPreviewImageFull} resizeMode="contain" />
          <TouchableOpacity style={styles.uploadPreviewCloseBtn} onPress={() => setPreviewUrl(null)}>
            <Ionicons name="close" size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.screenBackground,
  },
  uploadsTabRoot: {
    flex: 1,
  },
  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  uploadPreviewOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#000000E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPreviewImageFull: {
    width: '100%',
    height: '100%',
  },
  uploadPreviewCloseBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.md,
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000080',
  },
  uploadCard: {
    width: '48.5%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  uploadImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceElevated,
  },
  uploadMeta: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  uploadName: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.semibold,
  },
  uploadDate: {
    marginTop: 2,
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  uploadDescription: {
    marginTop: 4,
    fontSize: typography.xs,
    color: colors.text,
  },
  uploadDob: {
    marginTop: 3,
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
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
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  productThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    flexShrink: 0,
  },
  productThumb: {
    width: '100%',
    height: '100%',
  },
  productThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.text,
  },
  price: {
    fontSize: typography.sm,
    fontWeight: typography.bold,
    color: colors.success,
  },
  itemDesc: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  metaChipRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  metaChip: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.primaryTint,
  },
  metaChipText: {
    fontSize: 10,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  cardFooter: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },

  loader: {
    marginTop: spacing.xl,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontSize: typography.sm,
  },

  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: typography.md,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  modalHeaderCancel: {
    color: colors.textSecondary,
    fontSize: typography.sm,
  },
  modalHeaderSave: {
    color: colors.primary,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  formInner: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: typography.medium,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: typography.medium,
  },

  categoryList: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  categoryRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  categoryRowContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: typography.base,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  categoryDesc: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
});

const aiStyles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.md,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  empty: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  cakeCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
    alignItems: 'center',
  },
  cakeThumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  cakeThumbnailFallback: {
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cakePrompt: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
  },
  cakeDate: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
