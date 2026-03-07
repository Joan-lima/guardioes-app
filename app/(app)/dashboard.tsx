import { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { COLORS, FONTS } from '../../constants/theme';

interface DashStats {
  eventsCount:       number;
  totalCheckins:     number;
  totalSales:        number;
  totalCommission:   number;
  pendingMembers:    number;
  rankingPos:        number;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [stats, setStats]       = useState<DashStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  async function loadData() {
    if (!profile) return;

    // Events count
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', profile.id);

    // Total check-ins across my events
    const { data: myEvents } = await supabase
      .from('events')
      .select('id, attendees_count')
      .eq('created_by', profile.id);

    const totalCheckins = myEvents?.reduce((sum, e) => sum + (e.attendees_count || 0), 0) ?? 0;

    // Sales
    const { data: salesData } = await supabase
      .from('sales')
      .select('value, commission')
      .eq('leader_id', profile.id)
      .eq('status', 'confirmed');

    const totalSales      = salesData?.reduce((s, r) => s + r.value, 0) ?? 0;
    const totalCommission = salesData?.reduce((s, r) => s + r.commission, 0) ?? 0;

    // Pending members (ADM and LIDER)
    let pendingMembers = 0;
    if (profile.role !== 'MEMBRO') {
      const q = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      if (profile.role === 'LIDER') q.eq('city_id', profile.city_id ?? '');
      const { count } = await q;
      pendingMembers = count ?? 0;
    }

    // Recent events
    const { data: recent } = await supabase
      .from('events')
      .select('id, title, event_date, attendees_count, is_official')
      .eq('created_by', profile.id)
      .order('event_date', { ascending: false })
      .limit(3);

    setStats({ eventsCount: eventsCount ?? 0, totalCheckins, totalSales, totalCommission, pendingMembers, rankingPos: 0 });
    setRecentEvents(recent ?? []);
  }

  useEffect(() => { loadData(); }, [profile]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const hourNow = new Date().getHours();
  const greeting = hourNow < 12 ? 'Bom dia' : hourNow < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.dark }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />}
    >
      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray400, marginBottom: 4 }}>
          {greeting}, {profile?.name?.split(' ')[0]} 👋
        </Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 26, color: COLORS.white }}>
          Portal da Consciência
        </Text>
        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray600, marginTop: 4, fontStyle: 'italic' }}>
          "Você é responsável pela expansão da consciência na sua região"
        </Text>
      </View>

      {/* PE Banner */}
      <Card gold style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1.5 }}>
            Seus Pontos de Expansão
          </Text>
          <Text style={{ fontFamily: FONTS.title, fontSize: 32, color: COLORS.gold }}>
            {(profile?.total_pe ?? 0).toLocaleString('pt-BR')} PE
          </Text>
        </View>
        <Text style={{ fontSize: 40 }}>⚡</Text>
      </Card>

      {/* Stats Grid */}
      {profile?.role !== 'MEMBRO' && stats && (
        <View style={{ gap: 12, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard title="Eventos" value={stats.eventsCount} sub="realizados" icon={<Text>📅</Text>} />
            <StatCard title="Participantes" value={stats.totalCheckins} sub="check-ins totais" trend={stats.totalCheckins > 0 ? `+${stats.totalCheckins}` : undefined} icon={<Text>👥</Text>} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard title="Comissões" value={`R$ ${(stats.totalCommission).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="saldo disponível" trend="+0%" icon={<Text>💰</Text>} />
            {stats.pendingMembers > 0 && (
              <StatCard title="Pendentes" value={stats.pendingMembers} sub="aguardando aprovação" icon={<Text>⏳</Text>} />
            )}
          </View>
        </View>
      )}

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontFamily: FONTS.title, fontSize: 16, color: COLORS.white, marginBottom: 12 }}>
            Últimos Eventos
          </Text>
          {recentEvents.map((ev) => (
            <Card key={ev.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  {ev.is_official && (
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 9, color: COLORS.gold, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                      🏅 OFICIAL
                    </Text>
                  )}
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>{ev.title}</Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>
                    {new Date(ev.event_date).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.gold }}>{ev.attendees_count}</Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray500 }}>presentes</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      {profile?.role !== 'MEMBRO' && (
        <View style={{ gap: 12 }}>
          <Text style={{ fontFamily: FONTS.title, fontSize: 16, color: COLORS.white, marginBottom: 4 }}>
            Ações Rápidas
          </Text>
          <GoldButton onPress={() => router.push('/(app)/events' as any)}>
            + Novo Evento
          </GoldButton>
          <GoldButton variant="outline" onPress={() => router.push('/(app)/missions' as any)}>
            Ver Missões
          </GoldButton>
        </View>
      )}
    </ScrollView>
  );
}
