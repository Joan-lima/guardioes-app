import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { GoldButton } from '../../components/ui/GoldButton';
import { COLORS, FONTS } from '../../constants/theme';

interface RegData {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  guest_document: string | null;
  registered_at: string;
  checked_in_at: string | null;
  events: { title: string; event_date: string };
}

export default function CheckinConfirmScreen() {
  const { registrationId, token } = useLocalSearchParams();
  const { profile, loading: authLoading } = useAuthStore();
  const router = useRouter();

  const regId    = Array.isArray(registrationId) ? registrationId[0] : (registrationId ?? '');
  const tokenStr = Array.isArray(token) ? token[0] : (token ?? '');

  const [reg,        setReg]        = useState<RegData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed,  setConfirmed]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    async function load() {
      if (!regId || !tokenStr) { setError('QR Code inválido.'); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('registrations')
        .select('*, events(title, event_date)')
        .eq('id', regId)
        .eq('qr_token', tokenStr)
        .single();
      if (err || !data) { setError('Registro não encontrado ou QR Code inválido.'); }
      else { setReg(data); setConfirmed(!!data.checked_in_at); }
      setLoading(false);
    }
    load();
  }, [authLoading, regId, tokenStr]);

  async function confirm() {
    if (!profile || !reg) return;
    setConfirming(true);
    const { error: err } = await supabase
      .from('registrations')
      .update({ checked_in_at: new Date().toISOString(), confirmed_by: profile.id })
      .eq('id', reg.id);
    setConfirming(false);
    if (err) { setError(err.message); return; }
    setConfirmed(true);
  }

  const center = {
    flex: 1, backgroundColor: COLORS.dark,
    justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24,
  };

  if (authLoading || loading) {
    return <View style={center}><StatusBar style="light" /><ActivityIndicator color={COLORS.gold} size="large" /></View>;
  }

  if (error) {
    return (
      <View style={center}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>❌</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 18, color: COLORS.white, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={center}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, textAlign: 'center', marginBottom: 8 }}>
          Acesso Restrito
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginBottom: 24 }}>
          Faça login como líder para confirmar presenças
        </Text>
        <GoldButton onPress={() => router.replace('/(auth)/login' as any)}>Fazer Login</GoldButton>
      </View>
    );
  }

  if (!['ADM', 'LIDER'].includes(profile.role)) {
    return (
      <View style={center}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 18, color: COLORS.white, textAlign: 'center' }}>
          Apenas líderes podem confirmar presenças
        </Text>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={center}>
        <StatusBar style="light" />
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 48 }}>✅</Text>
        </View>
        <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white, textAlign: 'center', marginBottom: 8 }}>
          Presença Confirmada!
        </Text>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 16, color: COLORS.gold, textAlign: 'center' }}>
          {reg?.guest_name}
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, textAlign: 'center', marginTop: 8 }}>
          {(reg?.events as any)?.title}
        </Text>
      </View>
    );
  }

  const ev = (reg?.events as any);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark, padding: 24 }}>
      <StatusBar style="light" />

      <View style={{ marginTop: 60, marginBottom: 32 }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>
          Credenciamento
        </Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, marginBottom: 4 }}>
          {ev?.title}
        </Text>
        {ev?.event_date && (
          <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gold }}>
            📅 {new Date(ev.event_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        )}
      </View>

      <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
          Dados do Participante
        </Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white, marginBottom: 6 }}>
          {reg?.guest_name}
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, marginBottom: 2 }}>
          ✉️ {reg?.guest_email}
        </Text>
        {reg?.guest_phone && (
          <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, marginBottom: 2 }}>
            📱 {reg.guest_phone}
          </Text>
        )}
        {reg?.guest_document && (
          <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400 }}>
            🪪 {reg.guest_document}
          </Text>
        )}
        <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray600, marginTop: 12 }}>
          Inscrito em {reg && new Date(reg.registered_at).toLocaleDateString('pt-BR')}
        </Text>
      </View>

      {error && (
        <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: '#EF4444', textAlign: 'center' }}>⚠️ {error}</Text>
        </View>
      )}

      <GoldButton onPress={confirm} loading={confirming}>
        ✅ Confirmar Chegada
      </GoldButton>
    </View>
  );
}
