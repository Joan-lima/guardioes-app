import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { GoldButton } from '../../components/ui/GoldButton';
import { COLORS, FONTS } from '../../constants/theme';

type Role = 'LIDER' | 'MEMBRO';

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [role, setRole]         = useState<Role>('MEMBRO');

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [cpf, setCpf]           = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');

  function formatCpf(text: string) {
    const nums = text.replace(/\D/g, '').slice(0, 11);
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  function formatPhone(text: string) {
    const nums = text.replace(/\D/g, '').slice(0, 11);
    return nums
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  function validateStep1() {
    if (!name.trim()) return 'Informe seu nome completo';
    if (!email.trim() || !email.includes('@')) return 'E-mail inválido';
    const cpfNums = cpf.replace(/\D/g, '');
    if (cpfNums.length !== 11) return 'CPF deve ter 11 dígitos';
    if (!phone.trim()) return 'Informe seu telefone';
    return null;
  }

  function validateStep2() {
    if (password.length < 6) return 'Senha deve ter no mínimo 6 caracteres';
    if (password !== confirm) return 'Senhas não conferem';
    return null;
  }

  async function handleRegister() {
    const err = validateStep2();
    if (err) { Alert.alert('Atenção', err); return; }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          name: name.trim(),
          role,
          cpf: cpf.replace(/\D/g, ''),
          phone: phone.replace(/\D/g, ''),
        },
      },
    });

    if (error) {
      Alert.alert('Erro no cadastro', error.message);
      setLoading(false);
      return;
    }

    // Update profile with CPF and phone (trigger creates base profile)
    if (data.user) {
      await supabase.from('profiles').update({
        cpf:   cpf.replace(/\D/g, ''),
        phone: phone.replace(/\D/g, ''),
        name:  name.trim(),
        role,
      }).eq('id', data.user.id);
    }

    setLoading(false);
    Alert.alert(
      'Cadastro enviado!',
      role === 'LIDER'
        ? 'Seu cadastro como Líder foi enviado. Aguarde a aprovação do Anderson.'
        : 'Seu cadastro como Membro foi enviado. Aguarde a aprovação do líder e da equipe.',
      [{ text: 'OK', onPress: () => router.replace('/(auth)/pending') }]
    );
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: COLORS.white, fontFamily: FONTS.body, fontSize: 15,
  };

  const labelStyle = {
    fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400,
    letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.dark }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)} style={{ marginTop: 16, marginBottom: 32 }}>
          <Text style={{ color: COLORS.gray400, fontFamily: FONTS.body, fontSize: 14 }}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white, marginBottom: 4 }}>
          Solicitar Acesso
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, marginBottom: 32 }}>
          Passo {step} de 2 — {step === 1 ? 'Dados pessoais' : 'Acesso e perfil'}
        </Text>

        {/* Step indicator */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          {[1, 2].map((s) => (
            <View key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: s <= step ? COLORS.gold : 'rgba(255,255,255,0.1)',
            }} />
          ))}
        </View>

        {step === 1 ? (
          <View style={{ gap: 16 }}>
            <View>
              <Text style={labelStyle}>Nome Completo</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Anderson Luiz" placeholderTextColor={COLORS.gray600} style={inputStyle} />
            </View>
            <View>
              <Text style={labelStyle}>E-mail</Text>
              <TextInput value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor={COLORS.gray600} keyboardType="email-address" autoCapitalize="none" style={inputStyle} />
            </View>
            <View>
              <Text style={labelStyle}>CPF</Text>
              <TextInput value={cpf} onChangeText={(t) => setCpf(formatCpf(t))} placeholder="000.000.000-00" placeholderTextColor={COLORS.gray600} keyboardType="numeric" style={inputStyle} />
            </View>
            <View>
              <Text style={labelStyle}>Telefone / WhatsApp</Text>
              <TextInput value={phone} onChangeText={(t) => setPhone(formatPhone(t))} placeholder="(00) 00000-0000" placeholderTextColor={COLORS.gray600} keyboardType="phone-pad" style={inputStyle} />
            </View>

            <GoldButton
              onPress={() => {
                const err = validateStep1();
                if (err) { Alert.alert('Atenção', err); return; }
                setStep(2);
              }}
              style={{ marginTop: 8 }}
            >
              Próximo
            </GoldButton>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Role selection */}
            <View>
              <Text style={labelStyle}>Perfil de Acesso</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {(['MEMBRO', 'LIDER'] as Role[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    style={{
                      flex: 1, padding: 16, borderRadius: 12, alignItems: 'center',
                      backgroundColor: role === r ? `${COLORS.gold}1A` : 'rgba(255,255,255,0.05)',
                      borderWidth: 1.5,
                      borderColor: role === r ? COLORS.gold : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text style={{ fontSize: 24, marginBottom: 8 }}>{r === 'LIDER' ? '⚡' : '🛡️'}</Text>
                    <Text style={{ fontFamily: FONTS.bodyBold, color: role === r ? COLORS.gold : COLORS.gray400, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                      {r === 'LIDER' ? 'Líder' : 'Membro'}
                    </Text>
                    <Text style={{ fontFamily: FONTS.body, color: COLORS.gray600, fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                      {r === 'LIDER' ? 'Gerencia um grupo' : 'Participa do grupo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {role === 'LIDER' && (
                <View style={{ marginTop: 8, padding: 12, backgroundColor: `${COLORS.gold}0D`, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: COLORS.gold }}>
                  <Text style={{ fontFamily: FONTS.body, color: COLORS.gold, fontSize: 12 }}>
                    ⚠️ Acesso de Líder requer aprovação direta do Anderson.
                  </Text>
                </View>
              )}
            </View>

            <View>
              <Text style={labelStyle}>Senha</Text>
              <TextInput value={password} onChangeText={setPassword} placeholder="Mín. 6 caracteres" placeholderTextColor={COLORS.gray600} secureTextEntry style={inputStyle} />
            </View>
            <View>
              <Text style={labelStyle}>Confirmar Senha</Text>
              <TextInput value={confirm} onChangeText={setConfirm} placeholder="Repita a senha" placeholderTextColor={COLORS.gray600} secureTextEntry style={inputStyle} />
            </View>

            <GoldButton onPress={handleRegister} loading={loading} style={{ marginTop: 8 }}>
              Enviar Solicitação
            </GoldButton>
          </View>
        )}

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400 }}>
            Já tem acesso? <Text style={{ color: COLORS.gold, fontFamily: FONTS.bodyBold }}>Entrar</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
