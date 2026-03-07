import { View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../../stores/authStore';
import { COLORS, FONTS } from '../../constants/theme';

export default function PendingScreen() {
  const { profile, signOut } = useAuthStore();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <StatusBar style="light" />

      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: `${COLORS.gold}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 36 }}>⏳</Text>
      </View>

      <Text style={{ fontFamily: FONTS.title, fontSize: 22, color: COLORS.white, textAlign: 'center', marginBottom: 12 }}>
        Aguardando Aprovação
      </Text>

      <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
        Olá, <Text style={{ color: COLORS.gold, fontFamily: FONTS.bodyBold }}>{profile?.name}</Text>.{'\n\n'}
        Seu cadastro como{' '}
        <Text style={{ color: COLORS.gold }}>{profile?.role === 'LIDER' ? 'Líder' : 'Membro'}</Text>{' '}
        foi recebido e está sendo analisado pela equipe.{'\n\n'}
        Você receberá acesso assim que for aprovado.
      </Text>

      <View style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 32 }}>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
          Próximos passos
        </Text>
        {[
          profile?.role === 'LIDER'
            ? '✓ Anderson irá revisar seu perfil'
            : '✓ Líder da sua cidade irá confirmar',
          profile?.role === 'MEMBRO' ? '✓ Equipe irá validar seu cadastro' : null,
          '✓ Você receberá liberação de acesso',
        ].filter(Boolean).map((step, i) => (
          <Text key={i} style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, marginBottom: 6 }}>
            {step}
          </Text>
        ))}
      </View>

      <TouchableOpacity onPress={signOut}>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray600 }}>
          Sair da conta
        </Text>
      </TouchableOpacity>
    </View>
  );
}
