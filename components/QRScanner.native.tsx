import { CameraView, useCameraPermissions } from 'expo-camera';
import { View, Text } from 'react-native';
import { GoldButton } from './ui/GoldButton';
import { COLORS, FONTS } from '../constants/theme';

interface Props {
  onScan: (data: string) => void;
  active: boolean;
}

export default function QRScanner({ onScan, active }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>📷</Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginBottom: 20 }}>
          Precisamos da câmera para escanear QR Codes dos participantes
        </Text>
        <GoldButton onPress={requestPermission}>Permitir Câmera</GoldButton>
      </View>
    );
  }

  return (
    <CameraView
      style={{ flex: 1 }}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={active ? ({ data }) => onScan(data) : undefined}
    />
  );
}
