import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { GoldButton } from '../../components/ui/GoldButton';
import { COLORS, FONTS } from '../../constants/theme';

const ROLE_LABEL: Record<string, string> = {
  ADM:    'Administrador',
  LIDER:  'Líder Regional',
  MEMBRO: 'Guardião',
};

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendente',
  active:    'Ativo',
  rejected:  'Rejeitado',
  suspended: 'Suspenso',
};

const STATUS_COLOR: Record<string, string> = {
  pending:   '#F59E0B',
  active:    '#10B981',
  rejected:  '#EF4444',
  suspended: '#6B7280',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, fetchProfile } = useAuthStore();

  const [name,     setName]     = useState(profile?.name ?? '');
  const [phone,    setPhone]    = useState(profile?.phone ?? '');
  const [document, setDocument] = useState(profile?.document ?? '');
  const [saving,   setSaving]   = useState(false);

  async function save() {
    if (!profile) return;
    if (!name.trim()) { Alert.alert('Atenção', 'Nome é obrigatório'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), phone: phone.trim() || null, document: document.trim() || null })
      .eq('id', profile.id);
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    await fetchProfile();
    Alert.alert('Sucesso', 'Perfil atualizado!');
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontFamily: FONTS.body,
    fontSize: 14,
  };

  const labelStyle = {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: COLORS.gray400,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.dark }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
    >
      <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white, marginBottom: 20 }}>
        Meu Perfil
      </Text>

      {/* Avatar + info */}
      <Card style={{ alignItems: 'center', paddingVertical: 24, marginBottom: 20 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 36,
          backgroundColor: `${COLORS.gold}33`,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: `${COLORS.gold}66`,
          marginBottom: 12,
        }}>
          <Text style={{ fontFamily: FONTS.title, fontSize: 30, color: COLORS.gold }}>
            {profile?.name?.charAt(0) ?? '?'}
          </Text>
        </View>

        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.white, marginBottom: 4 }}>
          {profile?.name}
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <View style={{ backgroundColor: `${COLORS.gold}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gold }}>
              {ROLE_LABEL[profile?.role ?? 'MEMBRO']}
            </Text>
          </View>
          <View style={{ backgroundColor: `${STATUS_COLOR[profile?.status ?? 'pending']}22`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: STATUS_COLOR[profile?.status ?? 'pending'] }}>
              {STATUS_LABEL[profile?.status ?? 'pending']}
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: FONTS.title, fontSize: 22, color: COLORS.gold, marginTop: 16 }}>
          {(profile?.total_pe ?? 0).toLocaleString('pt-BR')} PE
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray500 }}>Pontos de Expansão</Text>
      </Card>

      {/* Readonly info */}
      <Card style={{ marginBottom: 20 }}>
        <View style={{ gap: 14 }}>
          <View>
            <Text style={labelStyle}>E-mail</Text>
            <View style={{ ...inputStyle, opacity: 0.5 }}>
              <Text style={{ color: COLORS.gray400, fontFamily: FONTS.body, fontSize: 14 }}>{profile?.email}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Editable fields */}
      <Card style={{ marginBottom: 24 }}>
        <Text style={{ fontFamily: FONTS.title, fontSize: 14, color: COLORS.white, marginBottom: 16 }}>
          Editar Dados
        </Text>
        <View style={{ gap: 14 }}>
          <View>
            <Text style={labelStyle}>Nome completo *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={COLORS.gray600}
              style={inputStyle}
            />
          </View>
          <View>
            <Text style={labelStyle}>Telefone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="(00) 00000-0000"
              placeholderTextColor={COLORS.gray600}
              keyboardType="phone-pad"
              style={inputStyle}
            />
          </View>
          <View>
            <Text style={labelStyle}>CPF</Text>
            <TextInput
              value={document}
              onChangeText={setDocument}
              placeholder="000.000.000-00"
              placeholderTextColor={COLORS.gray600}
              keyboardType="numeric"
              style={inputStyle}
            />
          </View>
          <GoldButton onPress={save} loading={saving} style={{ marginTop: 4 }}>
            Salvar Alterações
          </GoldButton>
        </View>
      </Card>
    </ScrollView>
  );
}
