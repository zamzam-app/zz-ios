import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

import type { Product, Category } from '../../api/endpoints/studio';
import type { CustomCake, UploadedCakeImage } from '../../api/endpoints/uploads';
import ImagePickerButton from '../../components/ImagePickerButton';
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
import type { MoreStackParamList } from '../../navigation/MoreNavigator';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

const newPricingId = () => `pricing_${Date.now()}_${Math.random().toString(16).slice(2)}`;

type StudioNav = NativeStackNavigationProp<MoreStackParamList, 'Studio'>;
type StudioTab = 'catalogue' | 'ai' | 'uploads';

function CategoryModal({
  visible,
  initial,
  onClose,
  onSubmit,
  submitting,
}: {
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
      const nextName = initial?.name ?? '';
      const nextDesc = initial?.description ?? '';
      queueMicrotask(() => {
        setName(nextName);
        setDesc(nextDesc);
      });
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
            {submitting ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.modalHeaderSave}>Save</Text>
            )}
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

function ProductModal({
  visible,
  initial,
  categories,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  initial?: Product;
  categories: Category[];
  onClose: () => void;
  onSubmit: (
    name: string,
    pricing: { quantityValue: string; amount: string }[],
    description: string,
    categoryList: string[],
    images: string[],
  ) => void;
  submitting: boolean;
}) {
  const [name, setName] = useState('');
  const [pricing, setPricing] = useState<{ id: string; quantityValue: string; amount: string }[]>([
    { id: newPricingId(), quantityValue: '', amount: '' },
  ]);
  const [description, setDescription] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      const nextName = initial?.name ?? '';
      const nextPricing =
        initial?.pricing && initial.pricing.length > 0
          ? initial.pricing.map((p) => ({
              id: newPricingId(),
              quantityValue: p.quantityValue.toString(),
              amount: p.amount.toString(),
            }))
          : [{ id: newPricingId(), quantityValue: '', amount: '' }];
      const nextDescription = initial?.description ?? '';
      const nextSelectedCats = initial?.categoryList ?? [];
      const nextImageUrl = initial?.images?.[0] ?? '';

      queueMicrotask(() => {
        setName(nextName);
        setPricing(nextPricing);
        setDescription(nextDescription);
        setSelectedCats(nextSelectedCats);
        setImageUrl(nextImageUrl);
        setImageUploading(false);
      });
    }
  }, [visible, initial]);

  const toggleCat = (id: string) =>
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalHeaderCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{initial ? 'Edit Cake' : 'New Cake'}</Text>
            <TouchableOpacity
              onPress={() =>
                onSubmit(
                  name,
                  pricing.map(({ id: _id, ...rest }) => rest),
                  description,
                  selectedCats,
                  imageUrl ? [imageUrl] : [],
                )
              }
              disabled={submitting || imageUploading}
            >
              {submitting || imageUploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.modalHeaderSave}>Save</Text>
              )}
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

            <View style={styles.pricingSection}>
              <View style={styles.pricingHeader}>
                <Text style={styles.label}>Pricing Options *</Text>
                <TouchableOpacity
                  style={styles.addPricingBtn}
                  onPress={() =>
                    setPricing((prev) => [
                      ...prev,
                      { id: newPricingId(), quantityValue: '', amount: '' },
                    ])
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addPricingBtnText}>Add Option</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pricingTableContainer}>
                {/* Unified Table Header */}
                <View style={styles.pricingTableHeader}>
                  <Text style={[styles.subLabel, { flex: 1.2 }]}>Qty *</Text>
                  <Text style={[styles.subLabel, { flex: 1.5 }]}>Amount *</Text>
                  {pricing.length > 1 && <View style={{ width: 48 }} />}
                </View>

                {/* Unified Table Rows */}
                {pricing.map((row, index) => (
                  <View key={row.id} style={styles.pricingTableRow}>
                    {/* Quantity Column */}
                    <View style={{ flex: 1.2 }}>
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.pricingInput}
                          value={row.quantityValue}
                          onChangeText={(val) => {
                            const newPricing = [...pricing];
                            newPricing[index].quantityValue = val;
                            setPricing(newPricing);
                          }}
                          placeholder="0.00"
                          placeholderTextColor={colors.textDisabled}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.inputSuffix}>kg</Text>
                      </View>
                    </View>

                    {/* Amount Column */}
                    <View style={{ flex: 1.5 }}>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputPrefix}>₹</Text>
                        <TextInput
                          style={styles.pricingInput}
                          value={row.amount}
                          onChangeText={(val) => {
                            const newPricing = [...pricing];
                            newPricing[index].amount = val;
                            setPricing(newPricing);
                          }}
                          placeholder="0.00"
                          placeholderTextColor={colors.textDisabled}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.inputSuffix}>INR</Text>
                      </View>
                    </View>

                    {/* Remove Button Column */}
                    {pricing.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeRowBtn}
                        onPress={() => setPricing((prev) => prev.filter((_, i) => i !== index))}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>

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
                      <Text
                        style={[
                          styles.chipText,
                          selectedCats.includes(cat.id) && styles.chipTextActive,
                        ]}
                      >
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

function AIStudioTab({ onOpenCustomCake }: { onOpenCustomCake: (item: CustomCake) => void }) {
  const { data: savedCakes, isLoading: cakesLoading } = useCustomCakes();
  const [searchQuery, setSearchQuery] = useState('');
  const [minAgeText, setMinAgeText] = useState('');
  const [maxAgeText, setMaxAgeText] = useState('');
  const [showAgeFilterModal, setShowAgeFilterModal] = useState(false);

  const minAge = minAgeText.trim().length > 0 ? Number(minAgeText) : undefined;
  const maxAge = maxAgeText.trim().length > 0 ? Number(maxAgeText) : undefined;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredCakes = useMemo(() => {
    const base = savedCakes ?? [];
    return base.filter((cake) => {
      const matchesSearch =
        !normalizedSearch ||
        cake.prompt.toLowerCase().includes(normalizedSearch) ||
        (cake.customerName ?? '').toLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;

      if (minAge === undefined && maxAge === undefined) return true;
      if (!cake.customerDob) return false;

      const dob = new Date(cake.customerDob);
      if (Number.isNaN(dob.getTime())) return false;
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;

      if (minAge !== undefined && age < minAge) return false;
      if (maxAge !== undefined && age > maxAge) return false;
      return true;
    });
  }, [savedCakes, normalizedSearch, minAge, maxAge]);

  return (
    <ScrollView contentContainerStyle={aiStyles.container} keyboardShouldPersistTaps="handled">
      <Text style={aiStyles.sectionTitle}>Customer Cake Orders</Text>
      <View style={aiStyles.filtersWrap}>
        <View style={aiStyles.searchRow}>
          <TextInput
            style={aiStyles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search description or customer name"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity
            style={[
              aiStyles.filterIconBtn,
              (minAgeText.trim().length > 0 || maxAgeText.trim().length > 0) &&
                aiStyles.filterIconBtnActive,
            ]}
            onPress={() => setShowAgeFilterModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={
                minAgeText.trim().length > 0 || maxAgeText.trim().length > 0
                  ? colors.primaryDark
                  : colors.textSecondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={aiStyles.clearBtn}
            onPress={() => {
              setSearchQuery('');
              setMinAgeText('');
              setMaxAgeText('');
            }}
            activeOpacity={0.8}
          >
            <Text style={aiStyles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>
        {(minAgeText.trim().length > 0 || maxAgeText.trim().length > 0) && (
          <View style={aiStyles.ageChipRow}>
            <View style={aiStyles.ageChip}>
              <Text
                style={aiStyles.ageChipText}
              >{`Age: ${minAgeText || 'Any'} - ${maxAgeText || 'Any'}`}</Text>
              <TouchableOpacity
                onPress={() => {
                  setMinAgeText('');
                  setMaxAgeText('');
                }}
                style={aiStyles.ageChipClear}
              >
                <Text style={aiStyles.ageChipClearText}>x</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      {cakesLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : !filteredCakes.length ? (
        <Text style={aiStyles.empty}>No custom cake orders yet</Text>
      ) : (
        filteredCakes.map((cake) => (
          <TouchableOpacity
            key={cake.id}
            style={aiStyles.cakeCard}
            activeOpacity={0.86}
            onPress={() => onOpenCustomCake(cake)}
          >
            {cake.imageUrl ? (
              <Image
                source={{ uri: cake.imageUrl }}
                style={aiStyles.cakeThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[aiStyles.cakeThumbnail, aiStyles.cakeThumbnailFallback]}>
                <Text style={{ fontSize: 24 }}>🎂</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={aiStyles.cakePrompt} numberOfLines={2}>
                {cake.prompt}
              </Text>
              {cake.customerName ? (
                <Text style={aiStyles.cakeCustomer} numberOfLines={1}>
                  {cake.customerName}
                </Text>
              ) : null}
              <Text style={aiStyles.cakeDate}>
                {new Date(cake.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

      <Modal
        visible={showAgeFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAgeFilterModal(false)}
      >
        <View style={aiStyles.filterModalRoot}>
          <TouchableOpacity
            style={aiStyles.filterModalScrim}
            activeOpacity={1}
            onPress={() => setShowAgeFilterModal(false)}
          />
          <View style={aiStyles.filterSheet}>
            <View style={aiStyles.filterSheetTop}>
              <View style={aiStyles.filterSheetHandle} />
              <View style={aiStyles.filterSheetHeader}>
                <Text style={aiStyles.filterSheetTitle}>Age Filter</Text>
                <TouchableOpacity
                  onPress={() => setShowAgeFilterModal(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.uiGray1,
                  }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={aiStyles.filterSheetBody}>
              <Text style={aiStyles.filterLabel}>Age group range</Text>
              <View style={aiStyles.ageRow}>
                <TextInput
                  style={aiStyles.ageInput}
                  value={minAgeText}
                  onChangeText={(text) => setMinAgeText(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="Min age"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={aiStyles.ageDivider}>to</Text>
                <TextInput
                  style={aiStyles.ageInput}
                  value={maxAgeText}
                  onChangeText={(text) => setMaxAgeText(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="Max age"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function UploadedImagesTab({
  onOpenUploadedCake,
}: {
  onOpenUploadedCake: (item: UploadedCakeImage) => void;
}) {
  const { data: uploadedImages, isLoading } = useUploadedCakes();
  const [searchQuery, setSearchQuery] = useState('');
  const [minAgeText, setMinAgeText] = useState('');
  const [maxAgeText, setMaxAgeText] = useState('');
  const [showAgeFilterModal, setShowAgeFilterModal] = useState(false);

  const minAge = minAgeText.trim().length > 0 ? Number(minAgeText) : undefined;
  const maxAge = maxAgeText.trim().length > 0 ? Number(maxAgeText) : undefined;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredUploads = useMemo(() => {
    const base = uploadedImages ?? [];
    return base.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        (item.name ?? '').toLowerCase().includes(normalizedSearch) ||
        (item.description ?? '').toLowerCase().includes(normalizedSearch);
      if (!matchesSearch) return false;

      if (minAge === undefined && maxAge === undefined) return true;
      if (!item.dob) return false;

      const dob = new Date(item.dob);
      if (Number.isNaN(dob.getTime())) return false;
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;

      if (minAge !== undefined && age < minAge) return false;
      if (maxAge !== undefined && age > maxAge) return false;
      return true;
    });
  }, [uploadedImages, normalizedSearch, minAge, maxAge]);

  return (
    <View style={styles.uploadsTabRoot}>
      <ScrollView contentContainerStyle={aiStyles.container} keyboardShouldPersistTaps="handled">
        <Text style={aiStyles.sectionTitle}>User Uploaded Images</Text>

        <View style={aiStyles.filtersWrap}>
          <View style={aiStyles.searchRow}>
            <TextInput
              style={aiStyles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search user or description"
              placeholderTextColor={colors.textSecondary}
            />
            <TouchableOpacity
              style={[
                aiStyles.filterIconBtn,
                (minAgeText.trim().length > 0 || maxAgeText.trim().length > 0) &&
                  aiStyles.filterIconBtnActive,
              ]}
              onPress={() => setShowAgeFilterModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="options-outline"
                size={18}
                color={
                  minAgeText.trim().length > 0 || maxAgeText.trim().length > 0
                    ? colors.primaryDark
                    : colors.textSecondary
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={aiStyles.clearBtn}
              onPress={() => {
                setSearchQuery('');
                setMinAgeText('');
                setMaxAgeText('');
              }}
              activeOpacity={0.8}
            >
              <Text style={aiStyles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>
          {(minAgeText.trim().length > 0 || maxAgeText.trim().length > 0) && (
            <View style={aiStyles.ageChipRow}>
              <View style={aiStyles.ageChip}>
                <Text
                  style={aiStyles.ageChipText}
                >{`Age: ${minAgeText || 'Any'} - ${maxAgeText || 'Any'}`}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setMinAgeText('');
                    setMaxAgeText('');
                  }}
                  style={aiStyles.ageChipClear}
                >
                  <Text style={aiStyles.ageChipClearText}>x</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : !filteredUploads.length ? (
          <Text style={aiStyles.empty}>No uploaded images yet</Text>
        ) : (
          <View style={styles.uploadGrid}>
            {filteredUploads.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.uploadCard}
                activeOpacity={0.85}
                onPress={() => onOpenUploadedCake(item)}
              >
                <Image
                  source={{ uri: item.referenceImageUrl }}
                  style={styles.uploadImage}
                  resizeMode="cover"
                />
                <View style={styles.uploadMeta}>
                  <Text style={styles.uploadName} numberOfLines={1}>
                    {item.name || 'Unknown User'}
                  </Text>
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
                    <Text style={styles.uploadDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  {item.dob ? (
                    <Text style={styles.uploadDob} numberOfLines={1}>
                      DOB:{' '}
                      {new Date(item.dob).toLocaleDateString('en-GB', {
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

      <Modal
        visible={showAgeFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAgeFilterModal(false)}
      >
        <View style={aiStyles.filterModalRoot}>
          <TouchableOpacity
            style={aiStyles.filterModalScrim}
            activeOpacity={1}
            onPress={() => setShowAgeFilterModal(false)}
          />
          <View style={aiStyles.filterSheet}>
            <View style={aiStyles.filterSheetTop}>
              <View style={aiStyles.filterSheetHandle} />
              <View style={aiStyles.filterSheetHeader}>
                <Text style={aiStyles.filterSheetTitle}>Age Filter</Text>
                <TouchableOpacity
                  onPress={() => setShowAgeFilterModal(false)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.uiGray1,
                  }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={aiStyles.filterSheetBody}>
              <Text style={aiStyles.filterLabel}>Age group range</Text>
              <View style={aiStyles.ageRow}>
                <TextInput
                  style={aiStyles.ageInput}
                  value={minAgeText}
                  onChangeText={(text) => setMinAgeText(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="Min age"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={aiStyles.ageDivider}>to</Text>
                <TextInput
                  style={aiStyles.ageInput}
                  value={maxAgeText}
                  onChangeText={(text) => setMaxAgeText(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="Max age"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  isAdmin,
}: {
  item: Product;
  categoryNames: string[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (next: boolean) => void;
  isMutating: boolean;
  isAdmin: boolean;
}) {
  // Pricing display logic
  let displayPrice = 'N/A';
  if (item.pricing && item.pricing.length > 0) {
    const validAmounts = item.pricing
      .map((p) => p.amount)
      .filter((a) => typeof a === 'number' && !isNaN(a));
    if (validAmounts.length > 0) {
      const minAmount = Math.min(...validAmounts);
      displayPrice = `Starts at ₹${minAmount.toFixed(2)} / kg`;
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardMainRow}>
        <View style={styles.productThumbWrap}>
          {item.images?.[0] ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.productThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productThumb, styles.productThumbFallback]}>
              <Text style={{ fontSize: 20 }}>🍰</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.price}>{displayPrice}</Text>
          </View>

          {item.description ? (
            <Text style={styles.itemDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

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

      {isAdmin && (
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
      )}
    </View>
  );
}

export default function StudioScreen() {
  const navigation = useNavigation<StudioNav>();
  const [activeTab, setActiveTab] = useState<StudioTab>('catalogue');
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

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

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MoreMenu');
  };

  const handleProductSubmit = (
    name: string,
    pricingState: { quantityValue: string; amount: string }[],
    description: string,
    categoryList: string[],
    images: string[],
  ) => {
    if (!name.trim()) return Alert.alert('Required', 'Cake name is required.');

    // Filter out rows that are incomplete (any row with a missing or non-numeric quantity/amount)
    const pricingPayload = pricingState
      .map((row) => {
        const quantityValue = parseFloat(row.quantityValue);
        const amount = parseFloat(row.amount);
        return { quantityValue, amount };
      })
      .filter((row) => !isNaN(row.quantityValue) && !isNaN(row.amount));

    // Validate pricing
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
          <AIStudioTab
            onOpenCustomCake={(item) =>
              navigation.navigate('StudioDocumentDetail', {
                type: 'custom-cake',
                item,
              })
            }
          />
        ) : activeTab === 'uploads' ? (
          <UploadedImagesTab
            onOpenUploadedCake={(item) =>
              navigation.navigate('StudioDocumentDetail', {
                type: 'uploaded-cake',
                item,
              })
            }
          />
        ) : productsLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <View style={[aiStyles.filtersWrap, { marginTop: spacing.md, marginBottom: 0 }]}>
              <View style={aiStyles.searchRow}>
                <TextInput
                  style={aiStyles.searchInput}
                  value={catalogueSearchQuery}
                  onChangeText={setCatalogueSearchQuery}
                  placeholder="Search title or description"
                  placeholderTextColor={colors.textSecondary}
                />
                {catalogueSearchQuery.length > 0 && (
                  <TouchableOpacity
                    style={aiStyles.clearBtn}
                    onPress={() => setCatalogueSearchQuery('')}
                    activeOpacity={0.8}
                  >
                    <Text style={aiStyles.clearBtnText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <FlatList
              style={styles.catalogueList}
              data={filteredProducts}
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
                    isAdmin={isAdmin}
                    onToggleActive={(next) =>
                      updateProduct.mutate({ id: item.id, payload: { isActive: next } })
                    }
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
          </>
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
            {isAdmin && (
              <TouchableOpacity
                onPress={() => {
                  setEditingCategory(undefined);
                  setShowCategoryModal(true);
                }}
              >
                <Text style={styles.modalHeaderSave}>+ New</Text>
              </TouchableOpacity>
            )}
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
                    {item.description ? (
                      <Text style={styles.categoryDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                  {isAdmin && (
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
                  )}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No categories yet.</Text>}
            />
          )}
        </SafeAreaView>
      </Modal>
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

  pricingSection: {
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  addPricingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addPricingBtnText: {
    fontSize: typography.sm,
    fontWeight: typography.semibold,
    color: colors.primary,
  },
  pricingTableContainer: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pricingTableHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pricingTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subLabel: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    height: 48,
  },
  pricingInput: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: colors.transparent,
  },
  inputPrefix: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    marginRight: 4,
  },
  inputSuffix: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    marginLeft: 4,
  },
  removeRowBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentRoseBg,
    alignItems: 'center',
    justifyContent: 'center',
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
  filtersWrap: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  filterIconBtnActive: {
    borderColor: colors.primaryTintStrong,
    backgroundColor: colors.primaryTint,
  },
  ageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    fontSize: typography.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  ageDivider: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.medium,
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  clearBtnText: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
    textTransform: 'uppercase',
  },
  ageChipRow: {
    marginTop: 2,
  },
  ageChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryTintStrong,
    paddingLeft: spacing.sm,
    paddingRight: 6,
    paddingVertical: 4,
  },
  ageChipText: {
    fontSize: typography.xs,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  ageChipClear: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.uiGray4,
  },
  ageChipClearText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: typography.bold,
  },
  filterModalRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  filterModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimDark40,
  },
  filterSheet: {
    maxHeight: '55%',
    minHeight: 240,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  filterSheetTop: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorderAlpha25,
    backgroundColor: colors.surfaceElevated,
  },
  filterSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.uiGray4,
    marginBottom: spacing.sm,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterSheetTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
  },
  filterSheetBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
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
  cakeCustomer: {
    marginTop: 3,
    fontSize: typography.xs,
    color: colors.primaryDark,
    fontWeight: typography.medium,
  },
});
