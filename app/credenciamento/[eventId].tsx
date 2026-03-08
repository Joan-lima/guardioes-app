import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { GoldButton } from '../../components/ui/GoldButton';
import { COLORS, FONTS } from '../../constants/theme';

interface EventInfo { title: string; event_date: string; attendees_count: number; }
interface Reg {
  id: string; guest_name: string; guest_email: string;
  guest_phone: string | null; guest_document: string | null;
  registered_at: string; checked_in_at: string | null;
}

type Tab = 'lista' | 'scanner';
type Filter = 'todos' | 'pendentes' | 'confirmados';

export default function CredenciamentoScreen() {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const { profile, loading: authLoading } = useAuthStore();
  const eventIdStr = Array.isArray(eventId) ? eventId[0] : (eventId ?? '');

  const [event,    setEvent]    = useState<EventInfo | null>(null);
  const [regs,     setRegs]     = useState<Reg[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<Tab>('lista');
  const [filter,   setFilter]   = useState<Filter>('todos');
  const [selected, setSelected] = useState<Reg | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [scanned,  setScanned]  = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!authLoading && profile) load();
  }, [authLoading, profile]);

  async function load() {
    const [evRes, regRes] = await Promise.all([
      supabase.from('events').select('title, event_date, attendees_count').eq('id', eventIdStr).single(),
      supabase.from('registrations').select('*').eq('event_id', eventIdStr).order('registered_at', { ascending: false }),
    ]);
    setEvent(evRes.data);
    setRegs(regRes.data ?? []);
    setLoading(false);
  }

  async function confirmReg(reg: Reg) {
    if (!profile) return;
    setConfirming(true);
    const { error } = await supabase
      .from('registrations')
      .update({ checked_in_at: new Date().toISOString(), confirmed_by: profile.id })
      .eq('id', reg.id);
    setConfirming(false);
    if (error) return;
    setRegs(prev => prev.map(r => r.id === reg.id ? { ...r, checked_in_at: new Date().toISOString() } : r));
    setSelected(null);
    setScanned(false);
    if (event) setEvent({ ...event, attendees_count: event.attendees_count + 1 });
  }

  function handleBarcodeScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    try {
      const url = new URL(data);
      const parts = url.pathname.split('/').filter(Boolean);
      const regId = parts[parts.length - 1];
      const token = url.searchParams.get('token');
      if (!regId || !token) { setScanned(false); return; }
      const found = regs.find(r => r.id === regId);
      if (found) {
        setSelected(found);
        setTab('lista');
      } else {
        // Not in list (different event or not registered), navigate to confirm page
        router.push(`/checkin-confirm/${regId}?token=${token}` as any);
      }
    } catch {
      setScanned(false);
    }
  }

  const filtered = regs.filter(r =>
    filter === 'todos' ? true :
    filter === 'confirmados' ? !!r.checked_in_at :
    !r.checked_in_at
  );

  const center = {
    flex: 1, backgroundColor: COLORS.dark,
    justifyContent: 'center' as const, alignItems: 'center' as const, padding: 24,
  };

  if (authLoading || loading) {
    return <View style={center}><StatusBar style="light" /><ActivityIndicator color={COLORS.gold} size="large" /></View>;
  }

  if (!profile || !['ADM', 'LIDER'].includes(profile.role)) {
    return (
      <View style={center}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 18, color: COLORS.white, textAlign: 'center' }}>
          Acesso apenas para líderes
        </Text>
      </View>
    );
  }

  const confirmedCount = regs.filter(r => !!r.checked_in_at).length;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={{ backgroundColor: '#171824', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ color: COLORS.gray400, fontFamily: FONTS.body, fontSize: 14 }}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white }}>{event?.title}</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
          <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gold }}>
            ✅ {confirmedCount} confirmados
          </Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray500 }}>
            📋 {regs.length} inscritos
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', margin: 16, borderRadius: 10, padding: 4 }}>
        {(['lista', 'scanner'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => { setTab(t); setScanned(false); }}
            style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: tab === t ? COLORS.gold : 'transparent' }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: tab === t ? COLORS.dark : COLORS.gray400 }}>
              {t === 'lista' ? '📋 Lista' : '📷 Scanner'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'lista' ? (
        <>
          {/* Filter */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
            {(['todos', 'pendentes', 'confirmados'] as Filter[]).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: filter === f ? COLORS.gold : 'rgba(255,255,255,0.15)', backgroundColor: filter === f ? `${COLORS.gold}22` : 'transparent' }}
              >
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: filter === f ? COLORS.gold : COLORS.gray500, textTransform: 'capitalize' }}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
            {filtered.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>📋</Text>
                <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>Nenhum inscrito neste filtro.</Text>
              </View>
            ) : (
              filtered.map(reg => (
                <TouchableOpacity
                  key={reg.id}
                  onPress={() => !reg.checked_in_at && setSelected(reg)}
                  activeOpacity={reg.checked_in_at ? 1 : 0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 14, paddingHorizontal: 16,
                    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
                    backgroundColor: reg.checked_in_at ? 'rgba(16,185,129,0.07)' : 'transparent',
                  }}
                >
                  <View style={{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: reg.checked_in_at ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)',
                    alignItems: 'center', justifyContent: 'center', marginRight: 12,
                  }}>
                    <Text style={{ fontSize: 16 }}>{reg.checked_in_at ? '✅' : '⏳'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: reg.checked_in_at ? '#10B981' : COLORS.white }}>
                      {reg.guest_name}
                    </Text>
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500 }}>
                      {reg.guest_email}
                    </Text>
                  </View>
                  {!reg.checked_in_at && (
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gold }}>Confirmar →</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        /* Scanner */
        <View style={{ flex: 1 }}>
          {Platform.OS === 'web' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
              <Text style={{ fontFamily: FONTS.title, fontSize: 18, color: COLORS.white, textAlign: 'center', marginBottom: 8 }}>
                Scanner de QR Code
              </Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginBottom: 24 }}>
                No celular, use a aba "Lista" para confirmar manualmente, ou use a câmera nativa para escanear o QR do participante — ele será aberto neste navegador.
              </Text>
            </View>
          ) : !permission?.granted ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, textAlign: 'center', marginBottom: 16 }}>
                Precisamos da câmera para escanear QR Codes
              </Text>
              <GoldButton onPress={requestPermission}>Permitir Câmera</GoldButton>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
              />
              <View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.white, textAlign: 'center' }}>
                    Aponte para o QR Code do participante
                  </Text>
                </View>
                {scanned && (
                  <TouchableOpacity
                    onPress={() => setScanned(false)}
                    style={{ marginTop: 12, backgroundColor: COLORS.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                  >
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.dark }}>Escanear Novamente</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Confirm Modal */}
      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" transparent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: '#171824', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 }}>
              Confirmar Presença
            </Text>
            <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white, marginBottom: 6 }}>
              {selected?.guest_name}
            </Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, marginBottom: 2 }}>
              ✉️ {selected?.guest_email}
            </Text>
            {selected?.guest_phone && (
              <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400, marginBottom: 2 }}>
                📱 {selected.guest_phone}
              </Text>
            )}
            {selected?.guest_document && (
              <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray400 }}>
                🪪 {selected.guest_document}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 28 }}>
              <TouchableOpacity
                onPress={() => { setSelected(null); setScanned(false); }}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center' }}
              >
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.gray400 }}>Cancelar</Text>
              </TouchableOpacity>
              <GoldButton
                onPress={() => selected && confirmReg(selected)}
                loading={confirming}
                style={{ flex: 1 }}
              >
                ✅ Confirmar
              </GoldButton>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
