import { useEffect, useRef, useState, createElement } from 'react';
import { View, Text } from 'react-native';
import jsQR from 'jsqr';
import { GoldButton } from './ui/GoldButton';
import { COLORS, FONTS } from '../constants/theme';

interface Props {
  onScan: (data: string) => void;
  active: boolean;
}

export default function QRScanner({ onScan, active }: Props) {
  const videoRef  = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const activeRef = useRef(active);
  const rafRef    = useRef<number | null>(null);

  const [status,   setStatus]   = useState<'requesting' | 'running' | 'error'>('requesting');
  const [errorMsg, setErrorMsg] = useState('');

  // Mantém activeRef sincronizado sem reiniciar a câmera
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    let stream: MediaStream;

    function scanFrame() {
      const video  = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== /* HAVE_ENOUGH_DATA */ 4) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && activeRef.current) {
        onScan(code.data);
      }

      rafRef.current = requestAnimationFrame(scanFrame);
    }

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('running');
        rafRef.current = requestAnimationFrame(scanFrame);
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
      {createElement('video', {
        ref: videoRef,
        style: { width: '100%', height: '100%', objectFit: 'cover' } as any,
        playsInline: true,
        muted: true,
        autoPlay: true,
      })}
      {createElement('canvas', {
        ref: canvasRef,
        style: { display: 'none' } as any,
      })}

      {/* Mira central */}
      <View style={{
        position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none' as any,
      }}>
        <View style={{
          width: 220, height: 220, borderRadius: 16,
          borderWidth: 2, borderColor: COLORS.gold,
        }} />
        <Text style={{
          fontFamily: FONTS.body, fontSize: 13, color: COLORS.white,
          marginTop: 20, textAlign: 'center',
          textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
        }}>
          {status === 'requesting' ? 'Iniciando câmera...' : 'Aponte para o QR Code do participante'}
        </Text>
      </View>
    </View>
  );
}
