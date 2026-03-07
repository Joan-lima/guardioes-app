import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { GoldButton } from '../../components/ui/GoldButton';
import { COLORS, FONTS } from '../../constants/theme';

interface EventInfo {
  title:      string;
  event_date: string;
  location:   string | null;
}

export default function CheckinScreen() {
  const { eventId, token } = useLocalSearchParams<{ eventId: string; token: string }>();
  const [event, setEvent]     = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [doc, setDoc]         = useState('');
  const [phone, setPhone]     = useState('');
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    async function load() {
      if (!eventId) return;
      const { data } = await supabase
        .from('events')
        .select('title, event_date, location')
        .eq('id', eventId)
        .is('cancelled_at', null)
        .single();
      setEvent(data);
      setLoading(false);
    }
    load();
  }, [eventId]);

  async function lookupByDoc(cpf: string) {
    const nums = cpf.replace(/\D/g, '');
    if (nums.length !== 11) return;
    const { data } = await supabase
      .from('check_ins')
      .select('guest_name, guest_email, guest_phone')
      .eq('guest_document', nums)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .single();
    if (data && !prefilled) {
      setName(data.guest_name ?? '');
      setEmail(data.guest_email ?? '');
      setPhone(data.guest_phone ?? '');
      setPrefilled(true);
    }
  }

  function formatDoc(text: string) {
    const n = text.replace(/\D/g, '').slice(0, 11);
    return n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  async function handleCheckin() {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Atenção', 'Nome e e-mail são obrigatórios');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('public_checkin', {
      p_qr_token: token,
      p_name:     name.trim(),
      p_email:    email.trim().toLowerCase(),
      p_document: doc.replace(/\D/g, '') || undefined,
      p_phone:    phone.replace(/\D/g, '') || undefined,
    });

    setSaving(false);
    if (error || !data?.success) {
      Alert.alert('Erro', data?.error ?? error?.message ?? 'Tente novamente');
      return;
    }
    setSuccess(true);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>❌</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, textAlign: 'center' }}>
          Evento não encontrado
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginTop: 8 }}>
          Este QR Code pode estar desatualizado ou o evento foi cancelado.
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <StatusBar style="light" />
        <View style={{
          width: 100, height: 100, borderRadius: 50,
          backgroundColor: 'rgba(34,197,94,0.15)', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24,
        }}>
          <Text style={{ fontSize: 48 }}>✅</Text>
        </View>
        <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white, textAlign: 'center', marginBottom: 8 }}>
          Presença Confirmada!
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 16, color: COLORS.gold, textAlign: 'center', marginBottom: 8 }}>
          {name}
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginBottom: 32 }}>
          {event.title}
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray600, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' }}>
          Expandindo a Consciência
        </Text>
      </View>
    );
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
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
        <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${COLORS.gold}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 28 }}>🛡️</Text>
          </View>
          <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            Guardiões da Consciência
          </Text>
          <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, textAlign: 'center' }}>
            {event.title}
          </Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gold, marginTop: 4 }}>
            {new Date(event.event_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {event.location && (
            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>
              📍 {event.location}
            </Text>
          )}
        </View>

        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white, textAlign: 'center', marginBottom: 24 }}>
          Confirme sua presença
        </Text>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={labelStyle}>CPF (opcional — preenche automaticamente)</Text>
            <TextInput
              value={doc}
              onChangeText={(t) => {
                const fmt = formatDoc(t);
                setDoc(fmt);
                if (fmt.replace(/\D/g, '').length === 11) lookupByDoc(fmt);
              }}
              placeholder="000.000.000-00"
              placeholderTextColor={COLORS.gray600}
              keyboardType="numeric"
              style={inputStyle}
            />
          </View>
          <View>
            <Text style={labelStyle}>Nome Completo *</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={COLORS.gray600} style={[inputStyle, prefilled && { borderColor: `${COLORS.gold}66` }]} />
          </View>
          <View>
            <Text style={labelStyle}>E-mail *</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor={COLORS.gray600} keyboardType="email-address" autoCapitalize="none" style={[inputStyle, prefilled && { borderColor: `${COLORS.gold}66` }]} />
          </View>
          <View>
            <Text style={labelStyle}>Telefone</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="(00) 00000-0000" placeholderTextColor={COLORS.gray600} keyboardType="phone-pad" style={inputStyle} />
          </View>

          <GoldButton onPress={handleCheckin} loading={saving} style={{ marginTop: 8 }}>
            Confirmar Presença
          </GoldButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
