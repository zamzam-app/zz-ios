import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Product, Category } from '../../../../api/endpoints/studio';
import ImagePickerButton from '../../../../components/shared/ImagePickerButton';
import { colors, spacing, radius, typography } from '../../../../theme/theme';

const newPricingId = () => `pricing_${Date.now()}_${Math.random().toString(16).slice(2)}`;

export function ProductFormSheet({
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
    pricing: { quantityValue: number; amount: number }[],
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

  const handleSubmit = () => {
    const pricingPayload = pricing
      .map((row) => {
        const quantityValue = parseFloat(row.quantityValue);
        const amount = parseFloat(row.amount);
        return { quantityValue, amount };
      })
      .filter((row) => !isNaN(row.quantityValue) && !isNaN(row.amount));

    onSubmit(name, pricingPayload, description, selectedCats, imageUrl ? [imageUrl] : []);
  };

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
            <TouchableOpacity onPress={handleSubmit} disabled={submitting || imageUploading}>
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
                <View style={styles.pricingTableHeader}>
                  <Text style={[styles.subLabel, { flex: 1.2 }]}>Qty *</Text>
                  <Text style={[styles.subLabel, { flex: 1.5 }]}>Amount *</Text>
                  {pricing.length > 1 && <View style={{ width: 48 }} />}
                </View>

                {pricing.map((row, index) => (
                  <View key={row.id} style={styles.pricingTableRow}>
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

const styles = StyleSheet.create({
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
});
