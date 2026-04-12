import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOutlet, useUpdateOutlet } from '../../hooks/useOutlets';
import { useOutletTypes } from '../../hooks/useOutletTypes';
import { useManagers } from '../../hooks/useUsers';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { InfrastructureStackParamList } from '../../navigation/InfrastructureNavigator';
import { Modal, FlatList } from 'react-native';

type Props = NativeStackScreenProps<InfrastructureStackParamList, 'OutletDetail'>;

function PickerModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
  multi,
}: {
  visible: boolean;
  title: string;
  items: { id: string; name: string }[];
  selected: string | string[];
  onSelect: (id: string) => void;
  onClose: () => void;
  multi?: boolean;
}) {
  const selectedArr = Array.isArray(selected) ? selected : [selected];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: typography.base }}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => {
            const isSelected = selectedArr.includes(item.id);
            return (
              <TouchableOpacity style={styles.pickerRow} onPress={() => onSelect(item.id)}>
                <Text style={styles.pickerName}>{item.name}</Text>
                {isSelected && <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function OutletDetailScreen({ route }: Props) {
  const { outletId } = route.params;
  const { data: outlet, isLoading } = useOutlet(outletId);
  const { data: outletTypes } = useOutletTypes();
  const { data: managers } = useManagers();
  const updateOutlet = useUpdateOutlet();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [outletTypeId, setOutletTypeId] = useState('');
  const [managerIds, setManagerIds] = useState<string[]>([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);

  useEffect(() => {
    if (outlet) {
      setName(outlet.name);
      setDescription(outlet.description ?? '');
      setAddress(outlet.address ?? '');
      setOutletTypeId(outlet.outletTypeId ?? '');
      setManagerIds(outlet.managerIds ?? []);
    }
  }, [outlet]);

  const handleSave = () => {
    if (!name.trim()) return Alert.alert('Required', 'Outlet name is required.');
    updateOutlet.mutate(
      {
        id: outletId,
        payload: {
          name: name.trim(),
          description: description.trim() || undefined,
          address: address.trim() || undefined,
          outletType: outletTypeId || undefined,
          managerIds,
        },
      },
      {
        onSuccess: () => setEditing(false),
        onError: () => Alert.alert('Error', 'Failed to update outlet.'),
      },
    );
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!outlet) {
    return <View style={styles.center}><Text style={{ color: colors.textSecondary }}>Outlet not found</Text></View>;
  }

  const selectedType = outletTypes?.find((t) => t.id === outletTypeId);
  const selectedManagers = managers?.filter((m) => managerIds.includes(m.id)) ?? [];
  const resolvedOutletTypeName = outlet.outletTypeName
    ?? outletTypes?.find((type) => type.id === outlet.outletTypeId)?.name
    ?? '—';
  const resolvedManagerNames = outlet.managerNames && outlet.managerNames.length > 0
    ? outlet.managerNames
    : (managers ?? [])
      .filter((manager) => (outlet.managerIds ?? []).includes(manager.id))
      .map((manager) => manager.name);

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.outletName}>{outlet.name}</Text>
            {resolvedOutletTypeName !== '—' && (
              <Text style={styles.outletType}>{resolvedOutletTypeName}</Text>
            )}
          </View>
          <TouchableOpacity
            style={editing ? styles.cancelBtn : styles.editBtn}
            onPress={() => { setEditing(!editing); }}
          >
            <Text style={editing ? styles.cancelBtnText : styles.editBtnText}>
              {editing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>★ {(outlet.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{outlet.totalFeedback}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {editing ? (
          /* Edit form */
          <View style={styles.form}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} />

            <Text style={styles.label}>Outlet Type</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowTypePicker(true)}>
              <Text style={{ color: selectedType ? colors.text : colors.textDisabled }}>
                {selectedType?.name ?? 'Select type...'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Managers</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowManagerPicker(true)}>
              <Text style={{ color: selectedManagers.length > 0 ? colors.text : colors.textDisabled }}>
                {selectedManagers.length > 0 ? selectedManagers.map((m) => m.name).join(', ') : 'Select managers...'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, updateOutlet.isPending && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={updateOutlet.isPending}
            >
              {updateOutlet.isPending
                ? <ActivityIndicator color={colors.textInverse} />
                : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          /* Read-only view */
          <View style={styles.card}>
            <Row label="Address" value={outlet.address ?? '—'} />
            <Row label="Outlet Type" value={resolvedOutletTypeName} />
            <Row
              label="Managers"
              value={resolvedManagerNames.join(', ') || '—'}
            />
          </View>
        )}
      </ScrollView>

      <PickerModal
        visible={showTypePicker}
        title="Select Outlet Type"
        items={outletTypes ?? []}
        selected={outletTypeId}
        onSelect={(id) => { setOutletTypeId(id); setShowTypePicker(false); }}
        onClose={() => setShowTypePicker(false)}
      />
      <PickerModal
        visible={showManagerPicker}
        title="Select Managers"
        items={managers ?? []}
        selected={managerIds}
        multi
        onSelect={(id) => setManagerIds((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        )}
        onClose={() => setShowManagerPicker(false)}
      />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  outletName: { fontSize: typography.xl, fontWeight: typography.bold, color: colors.text },
  outletType: { fontSize: typography.sm, color: colors.primary, marginTop: 4 },
  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editBtnText: { color: colors.primary, fontSize: typography.sm, fontWeight: typography.medium },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: typography.sm },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    ...shadow.sm,
  },
  statValue: { fontSize: typography.lg, fontWeight: typography.bold, color: colors.text },
  statLabel: { fontSize: typography.xs, color: colors.textSecondary, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: typography.sm, color: colors.textSecondary },
  rowValue: { fontSize: typography.sm, color: colors.text, fontWeight: typography.medium, maxWidth: '60%', textAlign: 'right' },

  form: { gap: spacing.sm },
  label: { fontSize: typography.sm, fontWeight: typography.medium, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: typography.base,
    color: colors.text,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: { color: colors.textInverse, fontSize: typography.base, fontWeight: typography.semibold },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.md, fontWeight: typography.semibold, color: colors.text },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerName: { fontSize: typography.base, color: colors.text },
});
