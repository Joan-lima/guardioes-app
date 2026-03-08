import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  RefreshControl, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { GoldButton } from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Badge';
import { COLORS, FONTS } from '../../constants/theme';

interface PendingUser {
  id: string; name: string; email: string; role: string;
  document: string | null; phone: string | null; created_at: string;
}

interface City {
  id: string; name: string; state: string;
}

interface Group {
  id: string; name: string; city_id: string;
  leader_id: string | null; is_active: boolean;
  cities: { name: string; state: string } | null;
  leader: { name: string } | null;
}

interface Leader {
  id: string; name: string; email: string;
}

type AdminTab = 'pending' | 'grupos' | 'usuarios';

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();

  const [tab, setTab]               = useState<AdminTab>('pending');
  const [pending, setPending]       = useState<PendingUser[]>([]);
  const [cities, setCities]         = useState<City[]>([]);
  const [groups, setGroups]         = useState<Group[]>([]);
  const [leaders, setLeaders]       = useState<Leader[]>([]);
  const [allUsers, setAllUsers]     = useState<PendingUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');

  // Form: new city
  const [showCityForm, setShowCityForm] = useState(false);
  const [newCity, setNewCity]           = useState({ name: '', state: '' });
  const [addingCity, setAddingCity]     = useState(false);

  // Form: new group
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroup, setNewGroup]           = useState({ name: '', city_id: '', leader_id: '' });
  const [addingGroup, setAddingGroup]     = useState(false);

  // Pending: which group is selected per user
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>({});

  async function load() {
    const [{ data: pend }, { data: cityData }, { data: groupData }, { data: leaderData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('cities').select('id, name, state').order('state').order('name'),
      supabase
        .from('groups')
        .select('id, name, city_id, leader_id, is_active, cities(name, state), leader:profiles!leader_id(name)')
        .order('name'),
      supabase.from('profiles').select('id, name, email').eq('role', 'LIDER').eq('status', 'active').order('name'),
    ]);
    setPending(pend ?? []);
    setCities(cityData ?? []);
    setGroups(groupData as any ?? []);
    setLeaders(leaderData ?? []);
  }

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles').select('*').neq('status', 'pending').order('name').limit(200);
    setAllUsers(data ?? []);
  }

  useEffect(() => {
    if (profile?.role === 'ADM') {
      load();
      if (tab === 'usuarios') loadUsers();
    }
  }, [profile, tab]);

  // ─── Pending ───────────────────────────────────────────────────────────────

  async function approveUser(user: PendingUser) {
    const groupId = selectedGroups[user.id];

    if (user.role === 'LIDER' && !groupId) {
      Alert.alert('Atenção', 'Selecione um grupo para atribuir o líder antes de aprovar.');
      return;
    }

    if (user.role === 'LIDER' && groupId) {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('profiles').update({
          status: 'active', group_id: groupId, city_id: group.city_id,
        }).eq('id', user.id),
        supabase.from('groups').update({ leader_id: user.id }).eq('id', groupId),
      ]);

      if (e1 || e2) { Alert.alert('Erro', (e1 || e2)!.message); return; }
      Alert.alert('✅', `${user.name} aprovado como líder de ${group.name}!`);
    } else {
      const { error } = await supabase
        .from('profiles').update({ status: 'active' }).eq('id', user.id);
      if (error) { Alert.alert('Erro', error.message); return; }
      Alert.alert('✅', `${user.name} aprovado!`);
    }
    load();
  }

  async function rejectUser(user: PendingUser) {
    Alert.alert('Rejeitar Usuário', `Deseja rejeitar ${user.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rejeitar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('profiles').update({ status: 'rejected' }).eq('id', user.id);
          if (error) { Alert.alert('Erro', error.message); return; }
          load();
        },
      },
    ]);
  }

  // ─── Cities ────────────────────────────────────────────────────────────────

  async function addCity() {
    if (!newCity.name.trim() || !newCity.state.trim()) {
      Alert.alert('Atenção', 'Nome e UF são obrigatórios');
      return;
    }
    setAddingCity(true);
    const { error } = await supabase.from('cities').insert({
      name: newCity.name.trim(),
      state: newCity.state.trim().toUpperCase().slice(0, 2),
    });
    setAddingCity(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setNewCity({ name: '', state: '' });
    setShowCityForm(false);
    load();
  }

  // ─── Groups ────────────────────────────────────────────────────────────────

  async function addGroup() {
    if (!newGroup.name.trim() || !newGroup.city_id) {
      Alert.alert('Atenção', 'Nome e cidade são obrigatórios');
      return;
    }
    setAddingGroup(true);
    const { error } = await supabase.from('groups').insert({
      name: newGroup.name.trim(),
      city_id: newGroup.city_id,
      leader_id: newGroup.leader_id || null,
    });
    setAddingGroup(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setNewGroup({ name: '', city_id: '', leader_id: '' });
    setShowGroupForm(false);
    load();
  }

  async function toggleGroupActive(group: Group) {
    await supabase.from('groups').update({ is_active: !group.is_active }).eq('id', group.id);
    load();
  }

  // ─── Guard ─────────────────────────────────────────────────────────────────

  if (profile?.role !== 'ADM') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, textAlign: 'center' }}>Acesso Restrito</Text>
        <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400, textAlign: 'center', marginTop: 8 }}>
          Esta área é exclusiva para Administradores.
        </Text>
      </View>
    );
  }

  const filteredUsers = allUsers.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const inputStyle = {
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.white, fontFamily: FONTS.body, fontSize: 14,
  };

  // Group groups by city for display
  const groupsByCity = groups.reduce<Record<string, Group[]>>((acc, g) => {
    const key = g.city_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(g);
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#111318', borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder }}>
        {([
          ['pending', `Pendentes${pending.length > 0 ? ` (${pending.length})` : ''}`],
          ['grupos', 'Grupos'],
          ['usuarios', 'Usuários'],
        ] as [AdminTab, string][]).map(([t, label]) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              flex: 1, paddingVertical: 14, alignItems: 'center',
              borderBottomWidth: tab === t ? 2 : 0, borderBottomColor: COLORS.gold,
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: tab === t ? COLORS.gold : COLORS.gray500, textTransform: 'uppercase', letterSpacing: 1 }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); if (tab === 'usuarios') await loadUsers(); setRefreshing(false); }}
            tintColor={COLORS.gold}
          />
        }
      >

        {/* ── PENDENTES ────────────────────────────────────────── */}
        {tab === 'pending' && (
          <>
            <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, marginBottom: 16 }}>
              Aprovações Pendentes
            </Text>

            {pending.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>✅</Text>
                <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>Nenhuma aprovação pendente.</Text>
              </View>
            ) : (
              pending.map(user => (
                <Card key={user.id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white }}>{user.name}</Text>
                        <Badge label={user.role} variant={user.role === 'LIDER' ? 'gold' : 'blue'} />
                      </View>
                      <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray400 }}>{user.email}</Text>
                      {user.document && (
                        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>CPF: {user.document}</Text>
                      )}
                      {user.phone && (
                        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500 }}>📱 {user.phone}</Text>
                      )}
                      <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray600, marginTop: 4 }}>
                        Cadastrado {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>

                  {/* Seletor de grupo para LIDER */}
                  {user.role === 'LIDER' && groups.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                        Atribuir ao grupo:
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {groups.filter(g => g.is_active).map(g => {
                            const isSelected = selectedGroups[user.id] === g.id;
                            return (
                              <TouchableOpacity
                                key={g.id}
                                onPress={() => setSelectedGroups(prev => ({ ...prev, [user.id]: g.id }))}
                                style={{
                                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                                  borderWidth: 1,
                                  borderColor: isSelected ? COLORS.gold : 'rgba(255,255,255,0.15)',
                                  backgroundColor: isSelected ? `${COLORS.gold}22` : 'rgba(255,255,255,0.05)',
                                }}
                              >
                                <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: isSelected ? COLORS.gold : COLORS.white }}>
                                  {g.name}
                                  {g.cities ? ` · ${(g.cities as any).name}` : ''}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                      {groups.length === 0 && (
                        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500 }}>
                          Crie um grupo primeiro na aba Grupos.
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => rejectUser(user)}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.red, alignItems: 'center' }}
                    >
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.red }}>✕ Rejeitar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => approveUser(user)}
                      style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.gold, alignItems: 'center' }}
                    >
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.dark }}>✓ Aprovar</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {/* ── GRUPOS ───────────────────────────────────────────── */}
        {tab === 'grupos' && (
          <>
            {/* Stats rápidos */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14 }}>
                <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.gold }}>{groups.filter(g => g.is_active).length}</Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray400 }}>Grupos Ativos</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14 }}>
                <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white }}>{cities.length}</Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray400 }}>Cidades</Text>
              </View>
            </View>

            {/* Ações */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => { setShowCityForm(!showCityForm); setShowGroupForm(false); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center' }}
              >
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.white }}>
                  {showCityForm ? '✕ Cancelar' : '+ Nova Cidade'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowGroupForm(!showGroupForm); setShowCityForm(false); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: `${COLORS.gold}22`, borderWidth: 1, borderColor: COLORS.gold, alignItems: 'center' }}
              >
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.gold }}>
                  {showGroupForm ? '✕ Cancelar' : '+ Novo Grupo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form: nova cidade */}
            {showCityForm && (
              <Card style={{ marginBottom: 16, gap: 10 }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>Nova Cidade</Text>
                <TextInput
                  value={newCity.name}
                  onChangeText={t => setNewCity(f => ({ ...f, name: t }))}
                  placeholder="Nome da cidade"
                  placeholderTextColor={COLORS.gray600}
                  style={inputStyle}
                />
                <TextInput
                  value={newCity.state}
                  onChangeText={t => setNewCity(f => ({ ...f, state: t }))}
                  placeholder="UF (ex: PR)"
                  placeholderTextColor={COLORS.gray600}
                  maxLength={2}
                  autoCapitalize="characters"
                  style={inputStyle}
                />
                <GoldButton onPress={addCity} loading={addingCity}>Adicionar Cidade</GoldButton>
              </Card>
            )}

            {/* Form: novo grupo */}
            {showGroupForm && (
              <Card style={{ marginBottom: 16, gap: 10 }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>Novo Grupo</Text>
                <TextInput
                  value={newGroup.name}
                  onChangeText={t => setNewGroup(f => ({ ...f, name: t }))}
                  placeholder="Ex: Cascavel Grupo 1"
                  placeholderTextColor={COLORS.gray600}
                  style={inputStyle}
                />

                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Cidade</Text>
                {cities.length === 0 ? (
                  <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500 }}>
                    Adicione uma cidade primeiro.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {cities.map(c => {
                        const isSelected = newGroup.city_id === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => setNewGroup(f => ({ ...f, city_id: c.id }))}
                            style={{
                              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                              borderWidth: 1,
                              borderColor: isSelected ? COLORS.gold : 'rgba(255,255,255,0.2)',
                              backgroundColor: isSelected ? `${COLORS.gold}22` : 'transparent',
                            }}
                          >
                            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: isSelected ? COLORS.gold : COLORS.white }}>
                              {c.name}/{c.state}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}

                {leaders.length > 0 && (
                  <>
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Líder (opcional)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {leaders.map(l => {
                          const isSelected = newGroup.leader_id === l.id;
                          return (
                            <TouchableOpacity
                              key={l.id}
                              onPress={() => setNewGroup(f => ({ ...f, leader_id: isSelected ? '' : l.id }))}
                              style={{
                                paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                                borderWidth: 1,
                                borderColor: isSelected ? COLORS.gold : 'rgba(255,255,255,0.2)',
                                backgroundColor: isSelected ? `${COLORS.gold}22` : 'transparent',
                              }}
                            >
                              <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: isSelected ? COLORS.gold : COLORS.white }}>
                                {l.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </>
                )}

                <GoldButton onPress={addGroup} loading={addingGroup}>Criar Grupo</GoldButton>
              </Card>
            )}

            {/* Lista de grupos por cidade */}
            {cities.map(city => {
              const cityGroups = groupsByCity[city.id] ?? [];
              if (cityGroups.length === 0) return (
                <Card key={city.id} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${COLORS.gold}22`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: COLORS.gold }}>{city.state}</Text>
                    </View>
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>{city.name}</Text>
                  </View>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray600 }}>sem grupos</Text>
                </Card>
              );

              return (
                <View key={city.id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, paddingHorizontal: 4 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${COLORS.gold}22`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 9, color: COLORS.gold }}>{city.state}</Text>
                    </View>
                    <Text style={{ fontFamily: FONTS.title, fontSize: 14, color: COLORS.white }}>
                      {city.name}
                    </Text>
                    <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500 }}>
                      · {cityGroups.length} grupo{cityGroups.length !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {cityGroups.map(g => (
                    <Card key={g.id} style={{ marginBottom: 6, marginLeft: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>{g.name}</Text>
                          <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>
                            {g.leader ? `👤 ${(g.leader as any).name}` : '👤 Sem líder'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Badge
                            label={g.is_active ? 'Ativo' : 'Inativo'}
                            variant={g.is_active ? 'green' : 'yellow'}
                          />
                          <TouchableOpacity onPress={() => toggleGroupActive(g)}>
                            <Text style={{ fontSize: 16 }}>{g.is_active ? '⏸' : '▶️'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  ))}
                </View>
              );
            })}

            {cities.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏙️</Text>
                <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>Nenhuma cidade cadastrada.</Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray600, marginTop: 4 }}>
                  Clique em "+ Nova Cidade" para começar.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── USUÁRIOS ─────────────────────────────────────────── */}
        {tab === 'usuarios' && (
          <>
            <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, marginBottom: 16 }}>
              Todos os Usuários
            </Text>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12,
              paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
            }}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por nome ou e-mail..."
                placeholderTextColor={COLORS.gray600}
                style={{ flex: 1, color: COLORS.white, fontFamily: FONTS.body, fontSize: 14 }}
              />
            </View>

            {filteredUsers.map(u => (
              <Card key={u.id} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: u.role === 'ADM' ? `${COLORS.red}33` : u.role === 'LIDER' ? `${COLORS.gold}33` : 'rgba(255,255,255,0.1)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: u.role === 'ADM' ? COLORS.red : u.role === 'LIDER' ? COLORS.gold : COLORS.white }}>
                    {u.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white }}>{u.name}</Text>
                    <Badge label={u.role} variant={u.role === 'ADM' ? 'red' : u.role === 'LIDER' ? 'gold' : 'blue'} />
                    <Badge label={(u as any).status} variant={(u as any).status === 'active' ? 'green' : (u as any).status === 'rejected' ? 'red' : 'yellow'} />
                  </View>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray500 }}>{u.email}</Text>
                </View>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>
                  {search ? 'Nenhum usuário encontrado.' : 'Carregando...'}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
