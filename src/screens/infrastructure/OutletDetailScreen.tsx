import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useOutlet, useOutletTypes } from '../../hooks/infrastructure';
import { useManagers } from '../../hooks/useUsers';
import { InfrastructureStackParamList } from '../../navigation/InfrastructureNavigator';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';

type Props = NativeStackScreenProps<InfrastructureStackParamList, 'OutletDetail'>;

export default function OutletDetailScreen({ route }: Props) {
  const { outletId } = route.params;
  const { data: outlet, isLoading } = useOutlet(outletId);
  const { data: outletTypes } = useOutletTypes();
  const { data: managers, isLoading: isManagersLoading } = useManagers();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!outlet) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Outlet not found</Text>
      </View>
    );
  }

  const resolvedOutletTypeName =
    outlet.outletTypeName ??
    outletTypes?.find((type) => type.id === outlet.outletTypeId)?.name ??
    '—';

  const resolvedManagerNames =
    outlet.managerNames && outlet.managerNames.length > 0
      ? outlet.managerNames
      : (managers ?? [])
          .filter((manager) => (outlet.managerIds ?? []).includes(manager.id))
          .map((manager) => manager.name);

  const hasManagerRefs = (outlet.managerIds?.length ?? 0) > 0;
  const shouldShowManagersRow =
    !hasManagerRefs || !isManagersLoading || resolvedManagerNames.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {outlet.images?.[0] && (
          <Image source={{ uri: outlet.images[0] }} style={styles.outletHero} resizeMode="cover" />
        )}

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.outletName}>{outlet.name}</Text>
            {resolvedOutletTypeName !== '—' && (
              <Text style={styles.outletType}>{resolvedOutletTypeName}</Text>
            )}
          </View>
        </View>

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

        <View style={styles.card}>
          <Row label="Address" value={outlet.address ?? '—'} />
          <Row label="Outlet Type" value={resolvedOutletTypeName} />
          {shouldShowManagersRow && (
            <Row label="Managers" value={resolvedManagerNames.join(', ') || '—'} />
          )}
        </View>
      </ScrollView>
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
  scroll: { padding: spacing.md, paddingBottom: 120, gap: spacing.md },

  outletHero: { width: '100%', height: 180, borderRadius: radius.lg, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  outletName: { fontSize: typography.xl, fontWeight: typography.bold, color: colors.text },
  outletType: { fontSize: typography.sm, color: colors.primary, marginTop: 4 },

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
  rowValue: {
    fontSize: typography.sm,
    color: colors.text,
    fontWeight: typography.medium,
    maxWidth: '60%',
    textAlign: 'right',
  },
});
