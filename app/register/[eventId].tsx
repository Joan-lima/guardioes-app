import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../lib/supabase';
import { GoldButton } from '../../components/ui/GoldButton';
import { COLORS, FONTS } from '../../constants/theme';

const CONFIRM_BASE = 'https://sistema.guardioesdaconsciencia.com.br/checkin-confirm';

interface EventInfo {
  title: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
}

interface Reg {
  id: string;
  qr_token: string;
  guest_name: string;
}

export default function RegisterScreen() {
  const { eventId } = useLocalSearchParams();
  const eventIdStr = Array.isArray(eventId) ? eventId[0] : (eventId ?? '');

  const [event,   setEvent]   = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [reg,     setReg]     = useState<Reg | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [doc,   setDoc]   = useState('');

  useEffect(() => {
    async function load() {
      if (!eventIdStr) { setLoading(false); return; }
      const { data } = await supabase
        .from('events')
        .select('title, event_date, event_time, location')
        .eq('id', eventIdStr)
        .is('cancelled_at', null)
        .single();
      setEvent(data);
      setLoading(false);
    }
    load();
  }, [eventIdStr]);

  function formatDoc(t: string) {
    const n = t.replace(/\D/g, '').slice(0, 11);
    return n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  async function register() {
    setErrorMsg(null);
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Nome e e-mail são obrigatórios.');
      return;
    }
    setSaving(true);

    // Verifica se já está inscrito com este e-mail
    const { data: existing } = await supabase
      .from('registrations')
      .select('id, qr_token, guest_name')
      .eq('event_id', eventIdStr)
      .eq('guest_email', email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      setReg(existing);
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert({
        event_id:       eventIdStr,
        guest_name:     name.trim(),
        guest_email:    email.trim().toLowerCase(),
        guest_phone:    phone.replace(/\D/g, '') || null,
        guest_document: doc.replace(/\D/g, '') || null,
      })
      .select('id, qr_token, guest_name')
      .single();

    setSaving(false);
    if (error) {
      if (error.code === '23505') {
        setErrorMsg('E-mail já inscrito. Use o mesmo e-mail para recuperar seu QR Code.');
      } else {
        setErrorMsg(error.message);
      }
      return;
    }
    setReg(data);
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.gold} size="large" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>❌</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, textAlign: 'center' }}>
          Evento não encontrado
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginTop: 8 }}>
          Este link pode estar desatualizado ou o evento foi cancelado.
        </Text>
      </View>
    );
  }

  if (reg) {
    const qrUrl = `${CONFIRM_BASE}/${reg.id}?token=${reg.qr_token}`;
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <StatusBar style="light" />
        <Text style={{ fontFamily: FONTS.title, fontSize: 22, color: COLORS.white, textAlign: 'center', marginBottom: 4 }}>
          Presença Confirmada! 🎉
        </Text>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.gold, marginBottom: 4 }}>
          {reg.guest_name}
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, textAlign: 'center', marginBottom: 28 }}>
          {event.title}
        </Text>

        <View style={{ backgroundColor: COLORS.white, padding: 20, borderRadius: 16, marginBottom: 24 }}>
          <QRCode value={qrUrl} size={220} backgroundColor={COLORS.white} color={COLORS.dark} />
        </View>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, width: '100%' }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white, textAlign: 'center', marginBottom: 6 }}>
            📱 Salve ou tire um print deste QR Code
          </Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, textAlign: 'center' }}>
            Apresente ao credenciamento no dia do evento
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.dark }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} keyboardShouldPersistTaps="handled">

        <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 32 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: `${COLORS.gold}1A`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 28 }}>🛡️</Text>
          </View>
          <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            Guardiões da Consciência
          </Text>
          <Text style={{ fontFamily: FONTS.title, fontSize: 22, color: COLORS.white, textAlign: 'center' }}>
            {event.title}
          </Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gold, marginTop: 6 }}>
            📅 {new Date(event.event_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          {event.event_time && (
            <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, marginTop: 2 }}>🕐 {event.event_time.slice(0, 5)}</Text>
          )}
          {event.location && (
            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, marginTop: 4 }}>📍 {event.location}</Text>
          )}
        </View>

        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white, textAlign: 'center', marginBottom: 24 }}>
          Confirme sua presença
        </Text>

        <View style={{ gap: 16 }}>
          <View>
            <Text style={labelStyle}>Nome Completo *</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Seu nome completo" placeholderTextColor={COLORS.gray600} style={inputStyle} />
          </View>
          <View>
            <Text style={labelStyle}>E-mail *</Text>
            <TextInput value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor={COLORS.gray600} keyboardType="email-address" autoCapitalize="none" style={inputStyle} />
          </View>
          <View>
            <Text style={labelStyle}>Telefone</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="(00) 00000-0000" placeholderTextColor={COLORS.gray600} keyboardType="phone-pad" style={inputStyle} />
          </View>
          <View>
            <Text style={labelStyle}>CPF (opcional)</Text>
            <TextInput value={doc} onChangeText={(t) => setDoc(formatDoc(t))} placeholder="000.000.000-00" placeholderTextColor={COLORS.gray600} keyboardType="numeric" style={inputStyle} />
          </View>

          {errorMsg && (
            <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 10, padding: 14 }}>
              <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: '#EF4444', textAlign: 'center' }}>⚠️ {errorMsg}</Text>
            </View>
          )}

          <GoldButton onPress={register} loading={saving} style={{ marginTop: 4 }}>
            Confirmar e Gerar QR Code
          </GoldButton>

          <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray600, textAlign: 'center' }}>
            Já se cadastrou? Use o mesmo e-mail para recuperar seu QR Code.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
