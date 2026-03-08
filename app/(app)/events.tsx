import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl, Switch, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { GoldButton } from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Badge';
import { COLORS, FONTS } from '../../constants/theme';

interface Event {
  id:               string;
  title:            string;
  description:      string | null;
  event_date:       string;
  event_time:       string | null;
  location:         string | null;
  is_official:      boolean;
  attendees_count:  number;
  leader_id:        string;
  cancelled_at:     string | null;
  group_id:         string | null;
  is_template:      boolean;
  parent_event_id:  string | null;
  leader_confirmed: boolean;
}

const REGISTER_BASE = 'https://sistema.guardioesdaconsciencia.com.br/register';

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const { profile } = useAuthStore();

  const [events,     setEvents]     = useState<Event[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [saving,     setSaving]     = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', event_date: '', event_time: '',
    location: '', is_official: false, is_quinzenal: false,
  });

  async function loadEvents() {
    let q = supabase
      .from('events')
      .select('*')
      .is('cancelled_at', null)
      .order('event_date', { ascending: false });

    if (profile?.role === 'LIDER') {
      // Líder vê apenas as instâncias do seu grupo (não templates)
      q = q.eq('is_template', false);
      if ((profile as any).group_id) q = q.eq('group_id', (profile as any).group_id);
      else q = q.eq('leader_id', profile.id);
    } else {
      // ADM vê templates + eventos normais (não vê instâncias geradas)
      q = q.is('parent_event_id', null);
    }

    const { data } = await q;
    setEvents(data ?? []);
    setLoading(false);
  }

  useEffect(() => { if (profile) loadEvents(); }, [profile]);

  async function onRefresh() { setRefreshing(true); await loadEvents(); setRefreshing(false); }

  async function createEvent() {
    if (!form.title || !form.event_date) {
      Alert.alert('Atenção', 'Título e data são obrigatórios');
      return;
    }
    setSaving(true);
    const isQuinzenal = profile?.role === 'ADM' && form.is_quinzenal;
    const { error } = await supabase.from('events').insert({
      title:       form.title,
      description: form.description || null,
      event_date:  form.event_date,
      event_time:  form.event_time || null,
      location:    form.location || null,
      is_official: profile?.role === 'ADM' ? (form.is_official || isQuinzenal) : false,
      is_template: isQuinzenal,
      leader_id:   profile!.id,
      city_id:     (profile as any)?.city_id ?? null,
      group_id:    isQuinzenal ? null : ((profile as any)?.group_id ?? null),
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setShowModal(false);
    setForm({ title: '', description: '', event_date: '', event_time: '', location: '', is_official: false, is_quinzenal: false });
    if (isQuinzenal) Alert.alert('✅ Evento Quinzenal criado!', 'Os líderes já podem ver e confirmar o encontro nos seus grupos.');
    loadEvents();
  }

  async function confirmEvent(eventId: string) {
    await supabase.from('events').update({
      leader_confirmed: true,
      confirmed_at: new Date().toISOString(),
    }).eq('id', eventId);
    loadEvents();
  }

  async function copyLink(eventId: string) {
    const url = `${REGISTER_BASE}/${eventId}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      if (navigator.share) {
        try { await navigator.share({ url, title: 'Confirmar Presença' }); } catch {}
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        Alert.alert('Link copiado!', 'Envie para os participantes confirmarem presença.');
      }
    } else {
      Alert.alert('Link de Inscrição', url);
    }
  }

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.white, fontFamily: FONTS.body, fontSize: 14,
  };

  const isLeaderOrAdm = profile?.role === 'ADM' || profile?.role === 'LIDER';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white }}>Eventos</Text>
          {isLeaderOrAdm && (
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
            <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400, textAlign: 'center' }}>Nenhum evento disponível.</Text>
          </View>
        ) : (
          events.map((ev) => {
            const isMyEvent = ev.leader_id === profile?.id || profile?.role === 'ADM';
            return (
              <Card key={ev.id} style={{ marginBottom: 12 }}>
                {/* Info */}
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    {ev.is_template && <Badge label="🔄 Quinzenal" variant="green" />}
                    {ev.is_official && !ev.is_template && <Badge label="Oficial" variant="gold" />}
                    {ev.parent_event_id && !ev.leader_confirmed && (
                      <Badge label="⚠️ Confirmar" variant="yellow" />
                    )}
                    {ev.parent_event_id && ev.leader_confirmed && (
                      <Badge label="✅ Confirmado" variant="green" />
                    )}
                  </View>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white }}>
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
                  {isMyEvent && !ev.is_template && (
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gold, marginTop: 6 }}>
                      👥 {ev.attendees_count} presença{ev.attendees_count !== 1 ? 's' : ''} confirmada{ev.attendees_count !== 1 ? 's' : ''}
                    </Text>
                  )}
                  {ev.is_template && (
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: '#10B981', marginTop: 6 }}>
                      🔄 Distribuído para todos os grupos ativos
                    </Text>
                  )}
                </View>

                {/* Confirmar realização (evento quinzenal pendente) */}
                {ev.parent_event_id && !ev.leader_confirmed && isMyEvent && (
                  <TouchableOpacity
                    onPress={() => confirmEvent(ev.id)}
                    style={{ backgroundColor: '#10B981', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 8 }}
                  >
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.white }}>
                      ✅ Confirmar Realização do Encontro
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => router.push(`/register/${ev.id}` as any)}
                    style={{ flex: 1, backgroundColor: COLORS.gold, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.dark }}>✅ Confirmar Presença</Text>
                  </TouchableOpacity>

                  {isMyEvent && (
                    <TouchableOpacity
                      onPress={() => copyLink(ev.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 16 }}>🔗</Text>
                    </TouchableOpacity>
                  )}

                  {isMyEvent && (
                    <TouchableOpacity
                      onPress={() => router.push(`/credenciamento/${ev.id}` as any)}
                      style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: `${COLORS.gold}66`, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 16 }}>📋</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
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
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Título *</Text>
                <TextInput value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="Ex: Encontro Quinzenal" placeholderTextColor={COLORS.gray600} style={inputStyle} />
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Data *</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={form.event_date}
                    onChange={(e: any) => setForm(f => ({ ...f, event_date: e.target.value }))}
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: '#FFFFFF', fontSize: 14, width: '100%', boxSizing: 'border-box', colorScheme: 'dark', fontFamily: 'inherit' } as any}
                  />
                ) : (
                  <TextInput value={form.event_date} onChangeText={t => setForm(f => ({ ...f, event_date: t }))} placeholder="AAAA-MM-DD" placeholderTextColor={COLORS.gray600} style={inputStyle} />
                )}
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Horário</Text>
                <TextInput value={form.event_time} onChangeText={t => setForm(f => ({ ...f, event_time: t }))} placeholder="19:00" placeholderTextColor={COLORS.gray600} style={inputStyle} />
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Local</Text>
                <TextInput value={form.location} onChangeText={t => setForm(f => ({ ...f, location: t }))} placeholder="Endereço ou nome do local" placeholderTextColor={COLORS.gray600} style={inputStyle} />
              </View>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Descrição</Text>
                <TextInput value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} placeholder="Detalhes do evento..." placeholderTextColor={COLORS.gray600} multiline numberOfLines={3} style={[inputStyle, { textAlignVertical: 'top', minHeight: 80 }]} />
              </View>
              {profile?.role === 'ADM' && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                    <View>
                      <Text style={{ fontFamily: FONTS.bodyBold, color: COLORS.white, fontSize: 14 }}>Evento Oficial</Text>
                      <Text style={{ fontFamily: FONTS.body, color: COLORS.gray500, fontSize: 12 }}>Exibido em destaque</Text>
                    </View>
                    <Switch value={form.is_official} onValueChange={v => setForm(f => ({ ...f, is_official: v, is_quinzenal: false }))} trackColor={{ true: COLORS.gold, false: 'rgba(255,255,255,0.1)' }} thumbColor={COLORS.white} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: form.is_quinzenal ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', borderRadius: 10, borderWidth: form.is_quinzenal ? 1 : 0, borderColor: '#10B981' }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontFamily: FONTS.bodyBold, color: COLORS.white, fontSize: 14 }}>🔄 Encontro Quinzenal</Text>
                      <Text style={{ fontFamily: FONTS.body, color: COLORS.gray500, fontSize: 12 }}>Gera automaticamente para todos os grupos ativos</Text>
                    </View>
                    <Switch value={form.is_quinzenal} onValueChange={v => setForm(f => ({ ...f, is_quinzenal: v, is_official: false }))} trackColor={{ true: '#10B981', false: 'rgba(255,255,255,0.1)' }} thumbColor={COLORS.white} />
                  </View>
                </>
              )}
              <GoldButton onPress={createEvent} loading={saving} style={{ marginTop: 8 }}>
                {form.is_quinzenal ? '🔄 Criar Encontro Quinzenal' : 'Criar Evento'}
              </GoldButton>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
