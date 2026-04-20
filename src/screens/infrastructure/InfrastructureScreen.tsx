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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOutlets, useDeleteOutlet } from '../../hooks/useOutlets';
import { Outlet } from '../../api/endpoints/outlets';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { InfrastructureStackParamList } from '../../navigation/InfrastructureNavigator';
import { useAuthStore } from '../../store/authStore';

type Nav = NativeStackNavigationProp<InfrastructureStackParamList, 'OutletsList'>;

type OutletCardProps = {
  outlet: Outlet;
  isAdmin: boolean;
  onPress: () => void;
  onDelete: () => void;
};

function FallbackOutletImage({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || 'O';
  return (
    <View style={styles.outletImageFallback}>
      <Text style={styles.outletImageFallbackText}>{letter}</Text>
    </View>
  );
}

function OutletCard({ outlet, isAdmin, onPress, onDelete }: OutletCardProps) {
  const imageUri = outlet.images?.[0];
  const managerLabel = outlet.managerNames && outlet.managerNames.length > 0
    ? `Manager: ${outlet.managerNames[0]}`
    : 'Manager unavailable';

  const handleQrPress = () => {
    if (outlet.qrToken) {
      Alert.alert('QR Token', outlet.qrToken);
      return;
    }
    Alert.alert('QR Code', 'QR code is not available for this outlet yet.');
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.cardMainRow}>
        <View style={styles.imageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.outletImage} resizeMode="cover" />
          ) : (
            <FallbackOutletImage name={outlet.name} />
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.titleRow}>
            <View style={styles.titleGroup}>
              <Text style={styles.outletName}>{outlet.name}</Text>
              {outlet.outletTypeName ? (
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{outlet.outletTypeName}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.rightMeta}>
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activeText}>ACTIVE</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity
                  onPress={onDelete}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.metaRows}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{outlet.address ?? 'No address'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{managerLabel}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleQrPress}>
          <Ionicons name="qr-code-outline" size={16} color={colors.textInverse} />
          <Text style={styles.actionBtnText}>QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
          <Ionicons name="create-outline" size={16} color={colors.textInverse} />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
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
        <View>
          <Text style={styles.heading}>Outlets</Text>
          <Text style={styles.subheading}>Manage your restaurant locations</Text>
        </View>

        <View style={styles.headerBtns}>
          {isAdmin && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('OutletTypes')}>
              <Text style={styles.secondaryBtnText}>Type</Text>
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateOutlet')}>
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
              isAdmin={isAdmin}
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
  root: { flex: 1, backgroundColor: '#F7F9FB' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  heading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  subheading: {
    marginTop: 2,
    fontSize: typography.sm,
    color: colors.textSecondary,
  },

  headerBtns: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D3C5AC80',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  createBtn: {
    backgroundColor: '#785A00',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
    ...shadow.sm,
  },
  createBtnText: {
    color: colors.textInverse,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },

  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingBottom: 120 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D3C5AC26',
    ...shadow.sm,
    gap: spacing.sm,
  },
  cardMainRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#F2F4F6',
    flexShrink: 0,
  },
  outletImage: {
    width: '100%',
    height: '100%',
  },
  outletImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6E8EA',
  },
  outletImageFallbackText: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: '#5A4300',
  },

  cardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleGroup: {
    flex: 1,
    gap: 4,
  },
  outletName: {
    fontSize: typography.base,
    fontWeight: typography.bold,
    color: colors.text,
  },
  typeChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FDF4E7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeChipText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: typography.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  rightMeta: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: '#16A34A',
  },
  activeText: {
    fontSize: 10,
    fontWeight: typography.bold,
    color: '#15803D',
    letterSpacing: 0.3,
  },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EFE6',
  },

  metaRows: {
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    fontSize: typography.xs,
    color: colors.textSecondary,
  },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: 2,
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnText: {
    color: colors.textInverse,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },

  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },
});
