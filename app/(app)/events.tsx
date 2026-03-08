import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl, Switch, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { GoldButton } from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Badge';
import { COLORS, FONTS } from '../../constants/theme';

interface Event {
  id:              string;
  title:           string;
  description:     string | null;
  event_date:      string;
  event_time:      string | null;
  location:        string | null;
  is_official:     boolean;
  qr_token:        string;
  attendees_count: number;
  created_by:      string;
  cancelled_at:    string | null;
}

const CHECKIN_BASE_URL = 'https://sistema.guardioesdaconsciencia.com.br/checkin';

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [events, setEvents]           = useState<Event[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [selectedEvent, setSelected]  = useState<Event | null>(null);
  const [showQR, setShowQR]           = useState(false);
  const [savingEvent, setSaving]      = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', event_date: '', event_time: '',
    location: '', is_official: false,
  });

  async function loadEvents() {
    const q = supabase.from('events').select('*').order('event_date', { ascending: false });
    if (profile?.role === 'LIDER') q.eq('leader_id', profile.id);
    const { data } = await q;
    setEvents(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadEvents(); }, [profile]);

  async function onRefresh() {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }

  async function createEvent() {
    if (!form.title || !form.event_date) {
      Alert.alert('Atenção', 'Título e data são obrigatórios');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('events').insert({
      title:       form.title,
      description: form.description || null,
      event_date:  form.event_date,
      event_time:  form.event_time || null,
      location:    form.location || null,
      is_official: profile?.role === 'ADM' ? form.is_official : false,
      leader_id:   profile!.id,
      city_id:     profile?.city_id ?? null,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setShowModal(false);
    setForm({ title: '', description: '', event_date: '', event_time: '', location: '', is_official: false });
    loadEvents();
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.white, fontFamily: FONTS.body, fontSize: 14,
  };

  if (selectedEvent && showQR) {
    const qrUrl = `${CHECKIN_BASE_URL}/${selectedEvent.id}?token=${selectedEvent.qr_token}`;
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => setShowQR(false)} style={{ position: 'absolute', top: 50, left: 24 }}>
          <Text style={{ color: COLORS.gray400, fontFamily: FONTS.body }}>← Voltar</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: FONTS.title, fontSize: 18, color: COLORS.white, textAlign: 'center', marginBottom: 8 }}>
          {selectedEvent.title}
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray400, marginBottom: 32 }}>
          QR Code para Check-in
        </Text>

        <View style={{ backgroundColor: COLORS.white, padding: 20, borderRadius: 16 }}>
          <QRCode value={qrUrl} size={220} backgroundColor={COLORS.white} color={COLORS.dark} />
        </View>

        <View style={{ marginTop: 24, padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, width: '100%' }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
            Participantes
          </Text>
          <Text style={{ fontFamily: FONTS.title, fontSize: 32, color: COLORS.gold }}>
            {selectedEvent.attendees_count}
          </Text>
        </View>

        <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray600, marginTop: 16, textAlign: 'center' }}>
          Participantes escaneiam o código e confirmam presença
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white }}>Eventos</Text>
          {profile?.role !== 'MEMBRO' && (
            <GoldButton onPress={() => setShowModal(true)} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
              + Novo
            </GoldButton>
          )}
        </View>

        {loading ? (
          <Text style={{ color: COLORS.gray400, fontFamily: FONTS.body, textAlign: 'center', marginTop: 40 }}>Carregando...</Text>
        ) : events.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>📅</Text>
            <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400, textAlign: 'center' }}>
              Nenhum evento criado ainda.
            </Text>
          </View>
        ) : (
          events.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              onPress={() => { setSelected(ev); setShowQR(true); }}
              activeOpacity={0.8}
            >
              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    {ev.is_official && <Badge label="Oficial" variant="gold" />}
                    {ev.cancelled_at && <Badge label="Cancelado" variant="red" />}
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white, marginTop: ev.is_official ? 8 : 0 }}>
                      {ev.title}
                    </Text>
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, marginTop: 4 }}>
                      📅 {new Date(ev.event_date).toLocaleDateString('pt-BR')}
                      {ev.event_time ? `  🕐 ${ev.event_time.slice(0, 5)}` : ''}
                    </Text>
                    {ev.location && (
                      <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>
                        📍 {ev.location}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <Text style={{ fontSize: 20 }}>📱</Text>
                    <Text style={{ fontFamily: FONTS.title, fontSize: 22, color: COLORS.gold }}>
                      {ev.attendees_count}
                    </Text>
                    <Text style={{ fontFamily: FONTS.body, fontSize: 9, color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 1 }}>presentes</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Event Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.dark, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white }}>Novo Evento</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={{ color: COLORS.gray400, fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ gap: 14 }}>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Título *
                </Text>
                <TextInput value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="Ex: Encontro Quinzenal — Março" placeholderTextColor={COLORS.gray600} style={inputStyle} />
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Data *
                </Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e: any) => setForm(f => ({ ...f, event_date: e.target.value }))}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      color: '#FFFFFF',
                      fontSize: 14,
                      width: '100%',
                      boxSizing: 'border-box',
                      colorScheme: 'dark',
                      fontFamily: 'inherit',
                    } as any}
                  />
                ) : (
                  <TextInput
                    value={form.event_date}
                    onChangeText={t => setForm(f => ({ ...f, event_date: t }))}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={COLORS.gray600}
                    style={inputStyle}
                  />
                )}
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Horário
                </Text>
                <TextInput value={form.event_time} onChangeText={t => setForm(f => ({ ...f, event_time: t }))} placeholder="19:00" placeholderTextColor={COLORS.gray600} style={inputStyle} />
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Local
                </Text>
                <TextInput value={form.location} onChangeText={t => setForm(f => ({ ...f, location: t }))} placeholder="Endereço ou nome do local" placeholderTextColor={COLORS.gray600} style={inputStyle} />
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                  Descrição
                </Text>
                <TextInput value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} placeholder="Detalhes do evento..." placeholderTextColor={COLORS.gray600} multiline numberOfLines={3} style={[inputStyle, { textAlignVertical: 'top', minHeight: 80 }]} />
              </View>
              {profile?.role === 'ADM' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                  <View>
                    <Text style={{ fontFamily: FONTS.bodyBold, color: COLORS.white, fontSize: 14 }}>Evento Oficial</Text>
                    <Text style={{ fontFamily: FONTS.body, color: COLORS.gray500, fontSize: 12 }}>Exibido em destaque para todos</Text>
                  </View>
                  <Switch value={form.is_official} onValueChange={v => setForm(f => ({ ...f, is_official: v }))} trackColor={{ true: COLORS.gold, false: 'rgba(255,255,255,0.1)' }} thumbColor={COLORS.white} />
                </View>
              )}
              <GoldButton onPress={createEvent} loading={savingEvent} style={{ marginTop: 8 }}>
                Criar Evento
              </GoldButton>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
