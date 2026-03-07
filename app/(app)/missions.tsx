import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { GoldButton } from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Badge';
import { COLORS, FONTS } from '../../constants/theme';

interface Mission {
  id: string; title: string; description: string;
  points: number; category: string; target_role: string; is_active: boolean;
}
interface Completion {
  id: string; mission_id: string; status: string;
}

export default function MissionsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [missions, setMissions]       = useState<Mission[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [saving, setSaving]           = useState(false);

  const [form, setForm] = useState({ title: '', description: '', points: '100', category: 'Expansão', target_role: 'LIDER' });

  async function load() {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('missions').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('mission_completions').select('*').eq('user_id', profile!.id),
    ]);
    setMissions(m ?? []);
    setCompletions(c ?? []);
  }

  useEffect(() => { if (profile) load(); }, [profile]);

  function getCompletionStatus(missionId: string) {
    return completions.find(c => c.mission_id === missionId)?.status ?? null;
  }

  async function handleComplete(missionId: string) {
    const status = getCompletionStatus(missionId);
    if (status) { Alert.alert('Missão', `Status: ${status}`); return; }

    // LIDER marca como completed (auto-validated for LIDER)
    const newStatus = profile?.role === 'LIDER' ? 'validated' : 'completed';
    const { error } = await supabase.from('mission_completions').insert({
      mission_id:   missionId,
      user_id:      profile!.id,
      status:       newStatus,
      validated_by: profile?.role === 'LIDER' ? profile.id : undefined,
      validated_at: profile?.role === 'LIDER' ? new Date().toISOString() : undefined,
    });
    if (error) { Alert.alert('Erro', error.message); return; }
    await load();
    Alert.alert('✅', profile?.role === 'LIDER' ? 'Missão concluída! PE concedidos.' : 'Missão marcada. Aguarde validação do líder.');
  }

  async function createMission() {
    if (!form.title || !form.description) { Alert.alert('Atenção', 'Preencha título e descrição'); return; }
    setSaving(true);
    const { error } = await supabase.from('missions').insert({
      title:       form.title,
      description: form.description,
      points:      parseInt(form.points) || 100,
      category:    form.category,
      target_role: form.target_role as any,
      created_by:  profile!.id,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setShowModal(false);
    setForm({ title: '', description: '', points: '100', category: 'Expansão', target_role: 'LIDER' });
    load();
  }

  const inputStyle = { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontFamily: FONTS.body, fontSize: 14 };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={COLORS.gold} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white }}>Missões</Text>
          {profile?.role === 'ADM' && (
            <GoldButton onPress={() => setShowModal(true)} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
              + Criar
            </GoldButton>
          )}
        </View>

        {missions.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
            <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>Nenhuma missão ativa.</Text>
          </View>
        ) : (
          missions.map(m => {
            const status = getCompletionStatus(m.id);
            const borderColor = status === 'validated' ? '#22C55E' : status === 'completed' ? '#EAB308' : `${COLORS.gold}66`;
            return (
              <Card key={m.id} style={{ marginBottom: 14, borderLeftWidth: 3, borderLeftColor: borderColor }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Badge label={m.category} variant="gray" />
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.gold }}>⚡ +{m.points} PE</Text>
                </View>
                <Text style={{ fontFamily: FONTS.title, fontSize: 16, color: COLORS.white, marginBottom: 6 }}>{m.title}</Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, lineHeight: 20, marginBottom: 12 }}>{m.description}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge label={m.target_role === 'LIDER' ? 'Para Líderes' : 'Para Membros'} variant="blue" />
                  {status === 'validated' ? (
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: '#22C55E' }}>✅ Concluída</Text>
                  ) : status === 'completed' ? (
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: '#EAB308' }}>⏳ Aguardando</Text>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleComplete(m.id)}
                      style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gold }}
                    >
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {profile?.role === 'LIDER' ? 'Concluir' : 'Aceitar'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.dark, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white }}>Nova Missão</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={{ color: COLORS.gray400, fontSize: 24 }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <View style={{ gap: 14 }}>
              {[
                { label: 'Título', key: 'title', placeholder: 'Ex: Realizar 2 encontros no mês' },
                { label: 'Descrição', key: 'description', placeholder: 'Detalhes da missão...', multiline: true },
                { label: 'Pontos (PE)', key: 'points', placeholder: '100', numeric: true },
              ].map(({ label, key, placeholder, multiline, numeric }) => (
                <View key={key}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{label}</Text>
                  <TextInput
                    value={(form as any)[key]}
                    onChangeText={t => setForm(f => ({ ...f, [key]: t }))}
                    placeholder={placeholder}
                    placeholderTextColor={COLORS.gray600}
                    multiline={multiline}
                    keyboardType={numeric ? 'numeric' : 'default'}
                    style={[inputStyle, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
                  />
                </View>
              ))}
              <GoldButton onPress={createMission} loading={saving} style={{ marginTop: 8 }}>Publicar Missão</GoldButton>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
