import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { GoldButton } from '../../components/ui/GoldButton';
import { COLORS, FONTS } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Preencha email e senha');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) {
      Alert.alert('Erro ao entrar', error.message);
      setLoading(false);
      return;
    }
    await fetchProfile();
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.dark }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">

        {/* Logo / Header */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            shadowColor: COLORS.gold, shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
          }}>
            <Text style={{ fontSize: 28 }}>🛡️</Text>
          </View>
          <Text style={{ fontFamily: FONTS.title, fontSize: 22, color: COLORS.white, textAlign: 'center', marginBottom: 8 }}>
            GUARDIÕES DA{'\n'}
            <Text style={{ color: COLORS.gold }}>CONSCIÊNCIA</Text>
          </Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, textAlign: 'center' }}>
            Portal de Gestão
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <View>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
              E-mail
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={COLORS.gray600}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                color: COLORS.white, fontFamily: FONTS.body, fontSize: 15,
              }}
            />
          </View>

          <View>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Senha
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.gray600}
              secureTextEntry
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                color: COLORS.white, fontFamily: FONTS.body, fontSize: 15,
              }}
            />
          </View>

          <GoldButton onPress={handleLogin} loading={loading} style={{ marginTop: 8 }}>
            Entrar no Portal
          </GoldButton>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            style={{ alignItems: 'center', paddingVertical: 12 }}
          >
            <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400 }}>
              Ainda não tem acesso?{' '}
              <Text style={{ color: COLORS.gold, fontFamily: FONTS.bodyBold }}>Solicitar cadastro</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={{ textAlign: 'center', fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray600, marginTop: 48, letterSpacing: 2 }}>
          EXPANDINDO A CONSCIÊNCIA
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
