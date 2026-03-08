import { useEffect, useRef, useState, createElement } from 'react';
import { View, Text } from 'react-native';
import { GoldButton } from './ui/GoldButton';
import { COLORS, FONTS } from '../constants/theme';

interface Props {
  onScan: (data: string) => void;
  active: boolean;
}

export default function QRScanner({ onScan, active }: Props) {
  const videoRef    = useRef<any>(null);
  const activeRef   = useRef(active);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status,   setStatus]   = useState<'requesting' | 'running' | 'error'>('requesting');
  const [errorMsg, setErrorMsg] = useState('');

  // Mantém activeRef sincronizado sem reiniciar a câmera
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    let stream: MediaStream;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('running');

        if (!('BarcodeDetector' in window)) {
          setErrorMsg('Scanner automático indisponível neste navegador. Use Chrome no Android ou Safari 17+ no iPhone.');
          return;
        }

        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || !activeRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) onScan(codes[0].rawValue);
          } catch {}
        }, 400);

      } catch (e: any) {
        setErrorMsg(
          e.name === 'NotAllowedError'
            ? 'Permissão de câmera negada. Libere nas configurações do navegador e recarregue a página.'
            : 'Erro ao acessar a câmera: ' + e.message
        );
        setStatus('error');
      }
    }

    startCamera();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  if (status === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 16, color: COLORS.white, textAlign: 'center', marginBottom: 8 }}>
          Câmera indisponível
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, textAlign: 'center' }}>
          {errorMsg}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, position: 'relative' as any }}>
      {/* Vídeo renderizado como elemento DOM nativo */}
      {createElement('video', {
        ref: videoRef,
        style: { width: '100%', height: '100%', objectFit: 'cover' } as any,
        playsInline: true,
        muted: true,
        autoPlay: true,
      })}

      {/* Mira central */}
      <View style={{
        position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' as any,
      }}>
        <View style={{
          width: 220, height: 220, borderRadius: 16,
          borderWidth: 2, borderColor: COLORS.gold,
          backgroundColor: 'transparent',
          shadowColor: COLORS.gold, shadowOpacity: 0.6, shadowRadius: 20,
        }} />
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.white, marginTop: 20, textAlign: 'center' }}>
          {status === 'requesting' ? 'Iniciando câmera...' : errorMsg || 'Aponte para o QR Code do participante'}
        </Text>
      </View>
    </View>
  );
}
