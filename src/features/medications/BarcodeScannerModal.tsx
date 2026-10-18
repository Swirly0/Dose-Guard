import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/Icon';
import { LoadingState } from '@/components/StateViews';
import { BARCODE_CATALOG } from '@/data/barcodeCatalog';
import { colors, radius, spacing } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
};

export function BarcodeScannerModal({ visible, onClose, onScanned }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <AppText variant="heading">Scan barcode</AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close scanner"
              hitSlop={spacing.md}>
              <Icon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} />
            </Pressable>
          </View>

          {visible && <ScannerBody onScanned={onScanned} />}

          <View style={styles.footer}>
            <AppText variant="caption" color={colors.textMuted}>
              Only codes in the built-in demo list are recognized. A match fills in the form; it
              does not verify the product.
            </AppText>
            <AppText variant="label">No label handy? Use a demo code:</AppText>
            <View style={styles.chips}>
              {BARCODE_CATALOG.map((p) => (
                <Chip
                  key={p.codes[0]}
                  label={p.codes[0]}
                  selected={false}
                  onPress={() => onScanned(p.codes[0])}
                  accessibilityLabel={`Use demo code ${p.codes[0]} for ${p.name}`}
                />
              ))}
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function ScannerBody({ onScanned }: { onScanned: (code: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  const handleScan = ({ data }: BarcodeScanningResult) => {
    if (handled.current) return;
    handled.current = true;
    onScanned(data);
  };

  if (!permission) {
    return (
      <View style={styles.cameraArea}>
        <LoadingState message="Checking camera access…" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.cameraArea, styles.permission]}>
        <AppText variant="subheading" style={styles.center}>
          Camera access needed
        </AppText>
        <AppText color={colors.textMuted} style={styles.center}>
          DoseGuard uses the camera only to read a medication barcode so it can fill in the form
          for you. You can always type the details instead.
        </AppText>
        {permission.canAskAgain ? (
          <Button label="Allow camera" onPress={requestPermission} />
        ) : (
          <Button label="Open settings" variant="secondary" onPress={() => Linking.openSettings()} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.cameraArea, styles.cameraBackground]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={handleScan}
      />
      <View style={styles.frame} pointerEvents="none" />
      <AppText variant="label" color={colors.textOnPrimary} style={styles.cameraHint}>
        Point the camera at the barcode
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cameraArea: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBackground: {
    backgroundColor: '#000',
  },
  permission: {
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  frame: {
    width: '75%',
    aspectRatio: 1.6,
    borderWidth: 3,
    borderColor: colors.textOnPrimary,
    borderRadius: radius.md,
  },
  cameraHint: {
    position: 'absolute',
    bottom: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
