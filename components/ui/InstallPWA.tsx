import { useState, useEffect } from 'react';
import { Platform, TouchableOpacity, Text, View } from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';

export function InstallPWA() {
  const [prompt, setPrompt]       = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Detecta se já está instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (Platform.OS !== 'web' || !prompt || dismissed || installed) return null;

  return (
    <View style={{
      position: 'absolute' as any,
      bottom: 24, left: 16, right: 16,
      zIndex: 999,
    }}>
      <View style={{
        backgroundColor: '#1E202E',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${COLORS.gold}66`,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <Text style={{ fontSize: 32 }}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>
            Instalar o App
          </Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray400, marginTop: 2 }}>
            Adicione à sua tela inicial para acesso rápido
          </Text>
        </View>
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={async () => {
              if (!prompt) return;
              prompt.prompt();
              const { outcome } = await prompt.userChoice;
              if (outcome === 'accepted') setInstalled(true);
              setPrompt(null);
            }}
            style={{
              paddingVertical: 8, paddingHorizontal: 14,
              backgroundColor: COLORS.gold, borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.dark }}>
              Instalar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDismissed(true)} style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray600 }}>
              Agora não
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
