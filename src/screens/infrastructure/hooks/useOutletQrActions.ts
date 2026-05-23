import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, Linking } from 'react-native';

import { Outlet } from '../../../api/endpoints/outlets';
import { QR_REVIEW_BASE_URL } from '../../../config/env';

interface QrCodeRef {
  toDataURL: (callback: (base64Data: string) => void) => void;
}

export function useOutletQrActions() {
  const [selectedQrOutlet, setSelectedQrOutlet] = React.useState<Outlet | null>(null);
  const qrRef = React.useRef<QrCodeRef | null>(null);

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

  return {
    selectedQrOutlet,
    setSelectedQrOutlet,
    qrRef,
    handleOpenQrModal,
    handleDownloadQr,
    handleOpenReviewUrl,
  };
}
