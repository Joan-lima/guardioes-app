import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { GoldButton } from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Badge';
import { COLORS, FONTS } from '../../constants/theme';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  document: string | null;
  phone: string | null;
  created_at: string;
}

interface City {
  id: string;
  name: string;
  state: string;
  member_count?: number;
}

type AdminTab = 'pending' | 'cities' | 'users';

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [tab, setTab]               = useState<AdminTab>('pending');
  const [pending, setPending]       = useState<PendingUser[]>([]);
  const [cities, setCities]         = useState<City[]>([]);
  const [allUsers, setAllUsers]     = useState<PendingUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [newCity, setNewCity]       = useState({ name: '', state: '' });
  const [addingCity, setAddingCity] = useState(false);
  const [showCityForm, setShowCityForm] = useState(false);

  async function load() {
    const [{ data: pend }, { data: cityData }, { data: users }] = await Promise.all([
      supabase.from('profiles').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('cities').select('id, name, state').order('state').order('name'),
      tab === 'users'
        ? supabase.from('profiles').select('*').neq('status', 'pending').order('name').limit(100)
        : Promise.resolve({ data: [] }),
    ]);
    setPending(pend ?? []);
    setCities(cityData ?? []);
    setAllUsers(users ?? []);
  }

  useEffect(() => { if (profile?.role === 'ADM') load(); }, [profile, tab]);

  async function approveUser(user: PendingUser) {
    Alert.alert(
      'Aprovar Usuário',
      `Aprovar ${user.name} como ${user.role}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprovar',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({ status: 'active' })
              .eq('id', user.id);
            if (error) { Alert.alert('Erro', error.message); return; }
            Alert.alert('✅', `${user.name} aprovado!`);
            load();
          },
        },
      ]
    );
  }

  async function rejectUser(user: PendingUser) {
    Alert.alert(
      'Rejeitar Usuário',
      `Deseja rejeitar ${user.name}? Esta ação é irreversível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({ status: 'rejected' })
              .eq('id', user.id);
            if (error) { Alert.alert('Erro', error.message); return; }
            load();
          },
        },
      ]
    );
  }

  async function addCity() {
    if (!newCity.name.trim() || !newCity.state.trim()) {
      Alert.alert('Atenção', 'Nome e estado são obrigatórios');
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

  async function assignUserToCity(userId: string, userName: string, cityId: string, cityName: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ city_id: cityId })
      .eq('id', userId);
    if (error) { Alert.alert('Erro', error.message); return; }
    Alert.alert('✅', `${userName} associado a ${cityName}`);
    load();
  }

  if (profile?.role !== 'ADM') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white, textAlign: 'center' }}>
          Acesso Restrito
        </Text>
        <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400, textAlign: 'center', marginTop: 8 }}>
          Esta área é exclusiva para Administradores.
        </Text>
      </View>
    );
  }

  const filteredUsers = allUsers.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#111318', borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder }}>
        {([
          ['pending', `Pendentes${pending.length > 0 ? ` (${pending.length})` : ''}`],
          ['cities', 'Cidades'],
          ['users', 'Usuários'],
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={COLORS.gold} />}
      >
        {/* PENDING TAB */}
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white }}>{user.name}</Text>
                        <Badge label={user.role} variant={user.role === 'LIDER' ? 'gold' : 'blue'} />
                      </View>
                      <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray400 }}>{user.email}</Text>
                      {user.document && (
                        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500, marginTop: 2 }}>
                          CPF: {user.document}
                        </Text>
                      )}
                      {user.phone && (
                        <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500 }}>
                          📱 {user.phone}
                        </Text>
                      )}
                      <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray600, marginTop: 4 }}>
                        Cadastrado {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                  </View>

                  {/* City assignment for LIDER */}
                  {user.role === 'LIDER' && cities.length > 0 && (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                        Associar a cidade:
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {cities.map(c => (
                            <TouchableOpacity
                              key={c.id}
                              onPress={() => assignUserToCity(user.id, user.name, c.id, c.name)}
                              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                            >
                              <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.white }}>{c.name}/{c.state}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
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

        {/* CITIES TAB */}
        {tab === 'cities' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white }}>
                Cidades ({cities.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowCityForm(!showCityForm)}
                style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: COLORS.gold }}
              >
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.gold }}>
                  {showCityForm ? '✕ Cancelar' : '+ Nova Cidade'}
                </Text>
              </TouchableOpacity>
            </View>

            {showCityForm && (
              <Card style={{ marginBottom: 16, gap: 12 }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>Nova Cidade</Text>
                <TextInput
                  value={newCity.name}
                  onChangeText={t => setNewCity(f => ({ ...f, name: t }))}
                  placeholder="Nome da cidade"
                  placeholderTextColor={COLORS.gray600}
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontFamily: FONTS.body }}
                />
                <TextInput
                  value={newCity.state}
                  onChangeText={t => setNewCity(f => ({ ...f, state: t }))}
                  placeholder="UF (ex: SP)"
                  placeholderTextColor={COLORS.gray600}
                  maxLength={2}
                  autoCapitalize="characters"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontFamily: FONTS.body }}
                />
                <GoldButton onPress={addCity} loading={addingCity}>Adicionar Cidade</GoldButton>
              </Card>
            )}

            {cities.map(c => (
              <Card key={c.id} style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${COLORS.gold}22`, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 10, color: COLORS.gold }}>{c.state}</Text>
                  </View>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white }}>{c.name}</Text>
                </View>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500 }}>🏙️</Text>
              </Card>
            ))}

            {cities.length === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏙️</Text>
                <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>Nenhuma cidade cadastrada.</Text>
              </View>
            )}
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.white }}>{u.name}</Text>
                    <Badge label={u.role} variant={u.role === 'ADM' ? 'red' : u.role === 'LIDER' ? 'gold' : 'blue'} />
                    <Badge label={u.status} variant={u.status === 'active' ? 'green' : u.status === 'rejected' ? 'red' : 'yellow'} />
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
