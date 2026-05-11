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
  Modal,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOutlets, useDeleteOutlet } from '../../hooks/useOutlets';
import { Outlet } from '../../api/endpoints/outlets';
import { colors, spacing, radius, typography, shadow } from '../../theme/theme';
import { InfrastructureStackParamList } from '../../navigation/InfrastructureNavigator';
import { useAuthStore } from '../../store/authStore';
import { CreateOutletContent } from './CreateOutletScreen';
import { QR_REVIEW_BASE_URL } from '../../config/env';

type Nav = NativeStackNavigationProp<InfrastructureStackParamList, 'OutletsList'>;

type OutletCardProps = {
  outlet: Outlet;
  isAdmin: boolean;
  onPress: () => void;
  onQrPress: () => void;
  onEditPress: () => void;
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

function OutletCard({ outlet, isAdmin, onPress, onQrPress, onEditPress, onDelete }: OutletCardProps) {
  const imageUri = outlet.images?.[0];
  const managerLabel = outlet.managerNames && outlet.managerNames.length > 0
    ? `${outlet.managerNames.length > 1 ? 'Managers' : 'Manager'}: ${outlet.managerNames.join(', ')}`
    : 'Manager unavailable';

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
        <TouchableOpacity style={styles.actionBtn} onPress={onQrPress}>
          <Ionicons name="qr-code-outline" size={16} color={colors.text} />
          <Text style={styles.actionBtnText}>QR Code</Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity style={styles.actionBtn} onPress={onEditPress}>
            <Ionicons name="create-outline" size={16} color={colors.text} />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function InfrastructureScreen() {
  const navigation = useNavigation<Nav>();
  const { data: outlets, isLoading, isFetching, refetch } = useOutlets();
  const deleteOutlet = useDeleteOutlet();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [editingOutlet, setEditingOutlet] = React.useState<Outlet | null>(null);
  const [selectedQrOutlet, setSelectedQrOutlet] = React.useState<Outlet | null>(null);
  const qrRef = React.useRef<any>(null);

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

  const buildQrUrl = (token: string) => `${QR_REVIEW_BASE_URL}/review/${encodeURIComponent(token)}`;

  const handleOpenQrModal = (outlet: Outlet) => {
    if (!outlet.qrToken) {
      Alert.alert('QR Code', 'QR code is not available for this outlet yet.');
      return;
    }
    setSelectedQrOutlet(outlet);
  };

  const handleDownloadQr = async () => {
    if (!selectedQrOutlet?.qrToken || !qrRef.current) return;

    try {
      qrRef.current.toDataURL(async (base64Data: string) => {
        try {
          const safeName = selectedQrOutlet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const fileName = `${safeName || 'outlet'}-qr.png`;
          const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'image/png',
              dialogTitle: 'Download QR Code',
              UTI: 'public.png',
            });
          } else {
            Alert.alert('Saved', 'QR code PNG has been generated.');
          }
        } catch {
          Alert.alert('Error', 'Failed to save QR code PNG.');
        }
      });
    } catch {
      Alert.alert('Error', 'Failed to generate QR code PNG.');
    }
  };

  const handleOpenReviewUrl = async () => {
    if (!selectedQrOutlet?.qrToken) return;
    const url = buildQrUrl(selectedQrOutlet.qrToken);
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Error', 'Unable to open review page.');
      return;
    }
    await Linking.openURL(url);
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
            <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
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
              onQrPress={() => handleOpenQrModal(item)}
              onEditPress={() => setEditingOutlet(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No outlets found</Text>}
        />
      )}

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.createModalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.createModalScrim}
            onPress={() => setShowCreateModal(false)}
          />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.createSheet}
            >
              <View style={styles.createSheetTop}>
                <View style={styles.createSheetHandle} />
                <View style={styles.createSheetHeader}>
                  <Text style={styles.createSheetTitle}>Create Outlet</Text>
                  <TouchableOpacity
                    style={styles.createSheetClose}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <CreateOutletContent
                onSuccess={() => {
                  setShowCreateModal(false);
                  void refetch();
                }}
                bottomPadding={20}
                fill={false}
                backgroundColor={colors.surface}
              />
            </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={editingOutlet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingOutlet(null)}
      >
        <View style={styles.createModalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.createModalScrim}
            onPress={() => setEditingOutlet(null)}
          />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.createSheet}
            >
              <View style={styles.createSheetTop}>
                <View style={styles.createSheetHandle} />
                <View style={styles.createSheetHeader}>
                  <Text style={styles.createSheetTitle}>Edit Outlet</Text>
                  <TouchableOpacity
                    style={styles.createSheetClose}
                    onPress={() => setEditingOutlet(null)}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <CreateOutletContent
                mode="edit"
                outletToEdit={editingOutlet}
                onSuccess={() => {
                  setEditingOutlet(null);
                  void refetch();
                }}
                submitLabel="Save Changes"
                bottomPadding={20}
                fill={false}
                backgroundColor={colors.surface}
              />
            </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={selectedQrOutlet !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedQrOutlet(null)}
      >
        <View style={styles.qrModalRoot}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.qrModalScrim}
            onPress={() => setSelectedQrOutlet(null)}
          />
          <View style={styles.qrModalCard}>
            <View style={styles.qrHeader}>
              <Text style={styles.qrTitle}>{selectedQrOutlet?.name ?? 'Outlet'}</Text>
              <TouchableOpacity
                style={styles.qrCloseBtn}
                onPress={() => setSelectedQrOutlet(null)}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedQrOutlet?.qrToken && (
              <>
                <View style={styles.qrCanvasWrap}>
                  <QRCode
                    value={buildQrUrl(selectedQrOutlet.qrToken)}
                    size={170}
                    backgroundColor={colors.surface}
                    color="#000000"
                    getRef={(ref) => { qrRef.current = ref; }}
                  />
                </View>
                <Text style={styles.qrHint}>Scan to access review page</Text>
              </>
            )}

            <View style={styles.qrActionRow}>
              <TouchableOpacity style={styles.qrActionBtn} onPress={handleDownloadQr}>
                <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.qrActionBtn} onPress={handleOpenReviewUrl}>
                <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBackground },

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
    backgroundColor: colors.buttonLightBg,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: typography.semibold,
    fontSize: typography.sm,
  },
  createBtn: {
    backgroundColor: colors.buttonPrimaryBg,
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
    backgroundColor: colors.buttonLightBg,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnText: {
    color: colors.text,
    fontSize: typography.xs,
    fontWeight: typography.semibold,
  },

  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: spacing.xxl },

  createModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  createModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 28, 30, 0.4)',
  },
  createSheet: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    shadowColor: '#191c1e',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 24,
  },
  createSheetTop: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#D3C5AC40',
    backgroundColor: colors.surfaceOverlay,
  },
  createSheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: '#E6E8EA',
    marginBottom: spacing.sm,
  },
  createSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createSheetTitle: {
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  createSheetClose: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F6',
  },
  createSheetCloseText: {
    color: colors.textSecondary,
    fontSize: typography.base,
    fontWeight: typography.semibold,
  },

  qrModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  qrModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 28, 30, 0.48)',
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D3C5AC40',
    ...shadow.md,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#D3C5AC33',
  },
  qrTitle: {
    flex: 1,
    fontSize: typography.lg,
    fontWeight: typography.bold,
    color: colors.text,
  },
  qrCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F6',
  },
  qrCloseText: {
    fontSize: typography.base,
    color: colors.textSecondary,
    fontWeight: typography.semibold,
  },
  qrCanvasWrap: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D3C5AC99',
    backgroundColor: '#FFFFFF',
  },
  qrHint: {
    marginTop: spacing.sm,
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: typography.medium,
  },
  qrActionRow: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  qrActionBtn: {
    width: 48,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#D3C5AC80',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
