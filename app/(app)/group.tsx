import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { COLORS, FONTS } from '../../constants/theme';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  total_pe: number;
  created_at: string;
}

interface CheckInStat {
  total: number;
  thisMonth: number;
}

export default function GroupScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [members, setMembers]       = useState<Member[]>([]);
  const [filtered, setFiltered]     = useState<Member[]>([]);
  const [search, setSearch]         = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [checkinStat, setCheckinStat] = useState<CheckInStat>({ total: 0, thisMonth: 0 });

  async function load() {
    if (!profile?.city_id) return;

    const [{ data: membersData }, { data: checkins }, { data: checkinMonth }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, role, status, total_pe, created_at')
        .eq('city_id', profile.city_id)
        .eq('status', 'active')
        .order('total_pe', { ascending: false }),
      supabase
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .not('guest_name', 'is', null),
      supabase
        .from('check_ins')
        .select('id', { count: 'exact', head: true })
        .gte('checked_in_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    const list = membersData ?? [];
    setMembers(list);
    setFiltered(list);
    setCheckinStat({
      total: (checkins as any)?.count ?? 0,
      thisMonth: (checkinMonth as any)?.count ?? 0,
    });
  }

  useEffect(() => { if (profile) load(); }, [profile]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(members); return; }
    const q = search.toLowerCase();
    setFiltered(members.filter(m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)));
  }, [search, members]);

  async function promoteToLeader(memberId: string, memberName: string) {
    Alert.alert(
      'Promover a Líder',
      `Deseja promover ${memberName} a Líder da cidade?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Promover',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({ role: 'LIDER' })
              .eq('id', memberId);
            if (error) { Alert.alert('Erro', error.message); return; }
            Alert.alert('✅', `${memberName} agora é Líder!`);
            load();
          },
        },
      ]
    );
  }

  async function removeFromCity(memberId: string, memberName: string) {
    Alert.alert(
      'Remover da Cidade',
      `Deseja remover ${memberName} desta cidade?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({ city_id: null })
              .eq('id', memberId);
            if (error) { Alert.alert('Erro', error.message); return; }
            load();
          },
        },
      ]
    );
  }

  const leaders = filtered.filter(m => m.role === 'LIDER');
  const regularMembers = filtered.filter(m => m.role === 'MEMBRO');

  const roleVariant = (role: string) => role === 'LIDER' ? 'gold' : role === 'ADM' ? 'red' : 'blue';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.dark }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={COLORS.gold} />}
    >
      <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white, marginBottom: 20 }}>
        Meu Grupo
      </Text>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        <StatCard
          title="Membros Ativos"
          value={String(members.length)}
          sub="na sua cidade"
          icon={<Text>👥</Text>}
        />
        <StatCard
          title="Check-ins Mês"
          value={String(checkinStat.thisMonth)}
          sub={`${checkinStat.total} total`}
          icon={<Text>✅</Text>}
        />
      </View>

      {/* Search */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
      }}>
        <Text style={{ fontSize: 16 }}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar membro..."
          placeholderTextColor={COLORS.gray600}
          style={{ flex: 1, color: COLORS.white, fontFamily: FONTS.body, fontSize: 14 }}
        />
      </View>

      {/* Leaders section */}
      {leaders.length > 0 && (
        <>
          <Text style={{ fontFamily: FONTS.title, fontSize: 14, color: COLORS.gold, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>
            Líderes ({leaders.length})
          </Text>
          {leaders.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              isMe={m.id === profile?.id}
              canManage={profile?.role === 'ADM'}
              onPromote={promoteToLeader}
              onRemove={removeFromCity}
              roleVariant={roleVariant}
            />
          ))}
        </>
      )}

      {/* Members section */}
      <Text style={{ fontFamily: FONTS.title, fontSize: 14, color: COLORS.gray400, marginBottom: 12, marginTop: leaders.length > 0 ? 16 : 0, letterSpacing: 1, textTransform: 'uppercase' }}>
        Membros ({regularMembers.length})
      </Text>
      {regularMembers.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text>
          <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>
            {search ? 'Nenhum membro encontrado.' : 'Nenhum membro ativo ainda.'}
          </Text>
        </View>
      ) : (
        regularMembers.map(m => (
          <MemberCard
            key={m.id}
            member={m}
            isMe={m.id === profile?.id}
            canManage={profile?.role === 'ADM' || profile?.role === 'LIDER'}
            onPromote={promoteToLeader}
            onRemove={removeFromCity}
            roleVariant={roleVariant}
          />
        ))
      )}
    </ScrollView>
  );
}

interface MemberCardProps {
  member: Member;
  isMe: boolean;
  canManage: boolean;
  onPromote: (id: string, name: string) => void;
  onRemove: (id: string, name: string) => void;
  roleVariant: (role: string) => any;
}

function MemberCard({ member: m, isMe, canManage, onPromote, onRemove, roleVariant }: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);
  const joinedDays = Math.floor((Date.now() - new Date(m.created_at).getTime()) / 86400000);

  return (
    <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
      <Card style={{ marginBottom: 8, borderLeftWidth: isMe ? 3 : 0, borderLeftColor: COLORS.gold }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {/* Avatar */}
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: isMe ? COLORS.gold : 'rgba(255,255,255,0.1)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontFamily: FONTS.title, fontSize: 16, color: isMe ? COLORS.dark : COLORS.white }}>
              {m.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: isMe ? COLORS.gold : COLORS.white }}>
                {m.name} {isMe ? '(você)' : ''}
              </Text>
              <Badge label={m.role} variant={roleVariant(m.role)} />
            </View>
            <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray500, marginTop: 2 }}>
              ⚡ {m.total_pe.toLocaleString('pt-BR')} PE · {joinedDays}d no grupo
            </Text>
          </View>

          <Text style={{ color: COLORS.gray600, fontSize: 12 }}>{expanded ? '▲' : '▼'}</Text>
        </View>

        {expanded && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', gap: 8 }}>
            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray400 }}>
              📧 {m.email}
            </Text>
            {canManage && !isMe && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {m.role === 'MEMBRO' && (
                  <TouchableOpacity
                    onPress={() => onPromote(m.id, m.name)}
                    style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gold, alignItems: 'center' }}
                  >
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gold }}>⬆️ Promover a Líder</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => onRemove(m.id, m.name)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.red, alignItems: 'center' }}
                >
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.red }}>🚫 Remover</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}
