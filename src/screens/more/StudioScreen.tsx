import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
  Switch, ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useProducts, useCategories, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useCreateCategory, useUpdateCategory, useDeleteCategory, useCustomCakes,
} from '../../hooks/useProducts';
import { Product, Category } from '../../api/endpoints/products';
import ImagePickerButton from '../../components/ImagePickerButton';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryModal({ visible, initial, onClose, onSubmit, submitting }: {
  visible: boolean; initial?: Category; onClose: () => void;
  onSubmit: (name: string, description: string) => void; submitting: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [desc, setDesc] = useState(initial?.description ?? '');
  React.useEffect(() => { if (visible) { setName(initial?.name ?? ''); setDesc(initial?.description ?? ''); } }, [visible, initial]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
          <Text style={styles.modalTitle}>{initial ? 'Edit Category' : 'New Category'}</Text>
          <TouchableOpacity onPress={() => onSubmit(name, desc)} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: typography.semibold }}>Save</Text>}
          </TouchableOpacity>
        </View>
        <View style={styles.formInner}>
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Category name" placeholderTextColor={colors.textDisabled} />
          <Text style={styles.label}>Description</Text>
          <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholder="Optional description" placeholderTextColor={colors.textDisabled} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Product Form Modal ───────────────────────────────────────────────────────

function ProductModal({ visible, initial, categories, onClose, onSubmit, submitting }: {
  visible: boolean; initial?: Product; categories: Category[];
  onClose: () => void;
  onSubmit: (name: string, price: string, description: string, categoryList: string[], images: string[]) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setPrice(initial?.price?.toString() ?? '');
      setDescription(initial?.description ?? '');
      setSelectedCats(initial?.categoryList ?? []);
      setImageUrl(initial?.images?.[0] ?? '');
    }
  }, [visible, initial]);

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>{initial ? 'Edit Product' : 'New Product'}</Text>
            <TouchableOpacity onPress={() => onSubmit(name, price, description, selectedCats, imageUrl ? [imageUrl] : [])} disabled={submitting}>
              {submitting ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: typography.semibold }}>Save</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.formInner} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Photo</Text>
            <ImagePickerButton
              imageUrl={imageUrl || undefined}
              folder="products"
              onUpload={setImageUrl}
              onRemove={() => setImageUrl('')}
              size={110}
            />
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Product name" placeholderTextColor={colors.textDisabled} />
            <Text style={styles.label}>Price *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="0.00" placeholderTextColor={colors.textDisabled} keyboardType="decimal-pad" />
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Product description" placeholderTextColor={colors.textDisabled} multiline />
            {categories.length > 0 && (
              <>
                <Text style={styles.label}>Categories</Text>
                <View style={styles.chipRow}>
                  {categories.map((cat) => (
                    <TouchableOpacity key={cat.id} style={[styles.chip, selectedCats.includes(cat.id) && styles.chipActive]} onPress={() => toggleCat(cat.id)}>
                      <Text style={[styles.chipText, selectedCats.includes(cat.id) && styles.chipTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── AI Studio Tab ────────────────────────────────────────────────────────────

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
              <View style={[aiStyles.cakeThumbnail, { backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' }]}>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StudioScreen() {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'ai'>('products');
  const { data: products, isLoading: prodLoading, refetch: refetchProducts } = useProducts();
  const { data: categories, isLoading: catLoading, refetch: refetchCats } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();

  const handleProductSubmit = (name: string, price: string, description: string, categoryList: string[], images: string[]) => {
    if (!name.trim()) return Alert.alert('Required', 'Product name is required.');
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) return Alert.alert('Invalid', 'Please enter a valid price.');

    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, payload: { name: name.trim(), price: parsedPrice, description: description.trim(), categoryList, images } },
        { onSuccess: () => setShowProductModal(false), onError: () => Alert.alert('Error', 'Failed to update product.') },
      );
    } else {
      createProduct.mutate(
        { name: name.trim(), price: parsedPrice, description: description.trim(), categoryList, images },
        { onSuccess: () => setShowProductModal(false), onError: () => Alert.alert('Error', 'Failed to create product.') },
      );
    }
  };

  const handleCategorySubmit = (name: string, description: string) => {
    if (!name.trim()) return Alert.alert('Required', 'Category name is required.');
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, payload: { name: name.trim(), description: description.trim() || undefined } },
        { onSuccess: () => setShowCategoryModal(false), onError: () => Alert.alert('Error', 'Failed to update category.') },
      );
    } else {
      createCategory.mutate(
        { name: name.trim(), description: description.trim() || undefined },
        { onSuccess: () => setShowCategoryModal(false), onError: () => Alert.alert('Error', 'Failed to create category.') },
      );
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      {/* Tabs */}
      <View style={styles.tabRow}>
        {([
          { key: 'products', label: 'Products' },
          { key: 'categories', label: 'Categories' },
          { key: 'ai', label: '✨ AI Studio' },
        ] as const).map((tab) => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'ai' ? (
        <AIStudioTab />
      ) : activeTab === 'products' ? (
        <FlatList
          data={products ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshing={prodLoading}
          onRefresh={refetchProducts}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.images?.[0] ? (
                <Image source={{ uri: item.images[0] }} style={styles.productThumb} resizeMode="cover" />
              ) : (
                <View style={[styles.productThumb, { backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 20 }}>🍰</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
                </View>
                {item.description ? <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <Switch
                  value={item.isActive}
                  onValueChange={(val) => updateProduct.mutate({ id: item.id, payload: { isActive: val } })}
                  trackColor={{ true: colors.success, false: colors.border }}
                  thumbColor={colors.textInverse}
                />
                <TouchableOpacity onPress={() => { setEditingProduct(item); setShowProductModal(true); }}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Delete', `Delete "${item.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteProduct.mutate(item.id) },
                ])}>
                  <Text style={styles.deleteText}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={!prodLoading ? <Text style={styles.empty}>No products yet</Text> : null}
        />
      ) : (
        <FlatList
          data={categories ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshing={catLoading}
          onRefresh={refetchCats}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => { setEditingCategory(item); setShowCategoryModal(true); }}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Alert.alert('Delete', `Delete "${item.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteCategory.mutate(item.id) },
                ])}>
                  <Text style={styles.deleteText}>Del</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={!catLoading ? <Text style={styles.empty}>No categories yet</Text> : null}
        />
      )}

      {activeTab !== 'ai' && (
        <View style={styles.fab}>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => {
              if (activeTab === 'products') { setEditingProduct(undefined); setShowProductModal(true); }
              else { setEditingCategory(undefined); setShowCategoryModal(true); }
            }}
          >
            <Text style={styles.fabText}>+ Add {activeTab === 'products' ? 'Product' : 'Category'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ProductModal
        visible={showProductModal} initial={editingProduct} categories={categories ?? []}
        onClose={() => setShowProductModal(false)} onSubmit={handleProductSubmit}
        submitting={createProduct.isPending || updateProduct.isPending}
      />
      <CategoryModal
        visible={showCategoryModal} initial={editingCategory}
        onClose={() => setShowCategoryModal(false)} onSubmit={handleCategorySubmit}
        submitting={createCategory.isPending || updateCategory.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: typography.sm, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: typography.semibold },
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, ...shadow.sm },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productThumb: { width: 48, height: 48, borderRadius: radius.md, overflow: 'hidden' },
  itemName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text, flex: 1 },
  price: { fontSize: typography.base, fontWeight: typography.bold, color: colors.primary },
  itemDesc: { fontSize: typography.sm, color: colors.textSecondary, marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  editText: { color: colors.primary, fontSize: typography.sm, fontWeight: typography.medium },
  deleteText: { color: colors.error, fontSize: typography.sm, fontWeight: typography.medium },
  fab: { position: 'absolute', bottom: 108, left: spacing.md, right: spacing.md },
  fabBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: 'center' },
  fabText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text },
  formInner: { padding: spacing.md, gap: spacing.sm },
  label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: typography.base, color: colors.text, backgroundColor: colors.surface },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm, color: colors.textSecondary },
  chipTextActive: { color: colors.textInverse, fontWeight: typography.medium },
});

const aiStyles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: 120, gap: spacing.sm },
  sectionTitle: { fontSize: typography.md, fontWeight: typography.bold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs },
  empty: { fontSize: typography.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  cakeCard: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm, alignItems: 'center' },
  cakeThumbnail: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden' },
  cakePrompt: { fontSize: typography.sm, color: colors.text, fontWeight: typography.medium },
  cakeDate: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 4 },
});
