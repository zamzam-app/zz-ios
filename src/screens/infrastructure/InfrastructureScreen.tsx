import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOutlets, useDeleteOutlet } from '../../hooks/useOutlets';
import { Outlet } from '../../api/endpoints/outlets';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { InfrastructureStackParamList } from '../../navigation/InfrastructureNavigator';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<InfrastructureStackParamList, 'OutletsList'>;

function OutletCard({ outlet, onPress, onDelete }: {
  outlet: Outlet;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.outletName}>{outlet.name}</Text>
          {outlet.outletTypeName && (
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{outlet.outletTypeName}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {outlet.address ? (
        <Text style={styles.address} numberOfLines={1}>{outlet.address}</Text>
      ) : (
        <Text style={styles.addressEmpty}>No address</Text>
      )}

      <View style={styles.cardFooter}>
        {outlet.managerNames && outlet.managerNames.length > 0 ? (
          <Text style={styles.managers} numberOfLines={1}>
            {outlet.managerNames.join(', ')}
          </Text>
        ) : (
          <Text style={styles.managers}>No manager assigned</Text>
        )}
        <View style={styles.ratingRow}>
          <Text style={styles.ratingText}>★ {(outlet.rating ?? 0).toFixed(1)}</Text>
          <Text style={styles.feedbackText}> · {outlet.totalFeedback} reviews</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function InfrastructureScreen() {
  const navigation = useNavigation<Nav>();
  const { data: outlets, isLoading, isFetching, refetch } = useOutlets();
  const deleteOutlet = useDeleteOutlet();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');

  const handleDelete = (outlet: Outlet) => {
    Alert.alert('Delete Outlet', `Delete "${outlet.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteOutlet.mutate(outlet.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Infrastructure</Text>
        <View style={styles.headerBtns}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('OutletTypes')}
            >
              <Text style={styles.secondaryBtnText}>Types</Text>
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateOutlet')}
            >
              <Text style={styles.createBtnText}>+ New</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />
      ) : (
        <FlatList
          data={outlets ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <OutletCard
              outlet={item}
              onPress={() => navigation.navigate('OutletDetail', { outletId: item.id })}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No outlets found</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heading: { fontSize: typography.xl, fontWeight: typography.bold, color: colors.text, letterSpacing: -0.5 },
  headerBtns: { flexDirection: 'row', gap: spacing.sm },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryBtnText: { color: colors.primary, fontWeight: typography.semibold, fontSize: typography.sm },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radius.full,
  },
  createBtnText: { color: colors.textInverse, fontWeight: typography.semibold, fontSize: typography.sm },

  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 120 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  outletName: { fontSize: typography.base, fontWeight: typography.semibold, color: colors.text },
  typePill: {
    backgroundColor: colors.primary + '18',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  typePillText: { fontSize: typography.xs, color: colors.primary, fontWeight: typography.medium },
  deleteIcon: { fontSize: 14, color: colors.textSecondary, paddingLeft: spacing.sm },
  address: { fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.sm },
  addressEmpty: { fontSize: typography.sm, color: colors.textDisabled, marginBottom: spacing.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  managers: { fontSize: typography.xs, color: colors.textSecondary, flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: typography.xs, color: '#f59e0b', fontWeight: typography.semibold },
  feedbackText: { fontSize: typography.xs, color: colors.textSecondary },

  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
});
