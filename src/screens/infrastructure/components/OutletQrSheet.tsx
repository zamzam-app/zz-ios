import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import type { Outlet } from '../../../api/endpoints/outlets';
import { QR_REVIEW_BASE_URL } from '../../../config/env';
import { colors, spacing, radius, typography, shadow } from '../../../theme/theme';

interface QrCodeRef {
  toDataURL: (callback: (base64Data: string) => void) => void;
}

interface OutletQrSheetProps {
  visible: boolean;
  outlet: Outlet | null;
  onQrRef: (ref: QrCodeRef | null) => void;
  onClose: () => void;
  onDownload: () => void;
  onOpenReviewUrl: () => void;
}

function OutletQrSheet({
  visible,
  outlet,
  onQrRef,
  onClose,
  onDownload,
  onOpenReviewUrl,
}: OutletQrSheetProps) {
  const buildQrUrl = (token: string) => `${QR_REVIEW_BASE_URL}/review/${encodeURIComponent(token)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.qrModalRoot}>
        <TouchableOpacity activeOpacity={1} style={styles.qrModalScrim} onPress={onClose} />
        <View style={styles.qrModalCard}>
          <View style={styles.qrHeader}>
            <Text style={styles.qrTitle}>{outlet?.name ?? 'Outlet'}</Text>
            <TouchableOpacity style={styles.qrCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {outlet?.qrToken && (
            <>
              <View style={styles.qrCanvasWrap}>
                <QRCode
                  value={buildQrUrl(outlet.qrToken)}
                  size={170}
                  backgroundColor={colors.surface}
                  color="#000000"
                  getRef={(ref) => {
                    onQrRef(ref);
                  }}
                />
              </View>
              <Text style={styles.qrHint}>Scan to access review page</Text>
            </>
          )}

          <View style={styles.qrActionRow}>
            <TouchableOpacity style={styles.qrActionBtn} onPress={onDownload}>
              <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrActionBtn} onPress={onOpenReviewUrl}>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(OutletQrSheet);

const styles = StyleSheet.create({
  qrModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  qrModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrimDark48,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.warmBorderAlpha25,
    ...shadow.md,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.warmBorderAlpha20,
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
    backgroundColor: colors.uiGray1,
  },
  qrCanvasWrap: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.warmBorderAlpha60,
    backgroundColor: colors.surface,
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
    borderColor: colors.warmBorderAlpha50,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
