import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { COLORS, FONTS } from '../../constants/theme';

type RankType = 'points' | 'sales' | 'growth';

interface RankEntry {
  id: string; name: string; city_name: string; state: string;
  score: number; rank: number; isMe?: boolean;
}

const VIEW_MAP: Record<RankType, string> = {
  points: 'v_ranking_points',
  sales:  'v_ranking_sales',
  growth: 'v_ranking_growth',
};

const SCORE_MAP: Record<RankType, (r: any) => number> = {
  points: (r) => r.score ?? 0,
  sales:  (r) => r.total_sales ?? 0,
  growth: (r) => r.monthly_checkins ?? 0,
};

const FORMAT_MAP: Record<RankType, (v: number) => string> = {
  points: (v) => `${v.toLocaleString('pt-BR')} PE`,
  sales:  (v) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
  growth: (v) => `${v} check-ins`,
};

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [type, setType]             = useState<RankType>('points');
  const [data, setData]             = useState<RankEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data: rows } = await supabase.from(VIEW_MAP[type]).select('*').order('rank').limit(50);
    if (!rows) return;
    const mapped: RankEntry[] = rows.map(r => ({
      id:        r.id,
      name:      r.name,
      city_name: r.city_name ?? '—',
      state:     r.state ?? '',
      score:     SCORE_MAP[type](r),
      rank:      r.rank,
      isMe:      r.id === profile?.id,
    }));
    setData(mapped);
  }

  useEffect(() => { load(); }, [type]);

  const top3   = data.slice(0, 3);
  const others = data.slice(3);
  const myEntry = data.find(r => r.isMe);

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumHeights = [80, 110, 60];
  const medals = ['🥈', '🥇', '🥉'];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.dark }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={COLORS.gold} />}
    >
      <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white, marginBottom: 20 }}>
        Ranking de Expansão
      </Text>

      {/* Type tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {([['points', 'Pontos'], ['sales', 'Vendas'], ['growth', 'Crescimento']] as [RankType, string][]).map(([t, label]) => (
          <TouchableOpacity
            key={t}
            onPress={() => setType(t)}
            style={{
              flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
              backgroundColor: type === t ? COLORS.gold : 'transparent',
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: type === t ? COLORS.dark : COLORS.gray400 }}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* My position */}
      {myEntry && (
        <Card gold style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: FONTS.title, fontSize: 14, color: COLORS.dark }}>#{myEntry.rank}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Minha posição</Text>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: COLORS.white }}>{myEntry.name}</Text>
            </View>
          </View>
          <Text style={{ fontFamily: FONTS.title, fontSize: 18, color: COLORS.gold }}>
            {FORMAT_MAP[type](myEntry.score)}
          </Text>
        </Card>
      )}

      {/* Podium */}
      {top3.length === 3 && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {podiumOrder.map((entry, i) => (
            <View key={entry.id} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{medals[i]}</Text>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: entry.isMe ? COLORS.gold : 'rgba(255,255,255,0.1)',
                alignItems: 'center', justifyContent: 'center', marginBottom: 8,
              }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 16, color: entry.isMe ? COLORS.dark : COLORS.white }}>
                  {entry.name.charAt(0)}
                </Text>
              </View>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.white, textAlign: 'center' }} numberOfLines={1}>
                {entry.name.split(' ')[0]}
              </Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray500, textAlign: 'center' }}>
                {entry.city_name}
              </Text>
              <View style={{
                width: '100%', height: podiumHeights[i],
                backgroundColor: i === 1 ? `${COLORS.gold}33` : 'rgba(255,255,255,0.05)',
                borderTopLeftRadius: 8, borderTopRightRadius: 8, marginTop: 8,
                borderTopWidth: 2, borderTopColor: i === 1 ? COLORS.gold : 'rgba(255,255,255,0.1)',
                alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6,
              }}>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: i === 1 ? COLORS.gold : COLORS.gray400 }}>
                  #{entry.rank}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Full table */}
      <Card>
        {others.map((entry) => (
          <View key={entry.id} style={{
            flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
            backgroundColor: entry.isMe ? `${COLORS.gold}0D` : 'transparent',
          }}>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.gray500, width: 32 }}>
              #{entry.rank}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: entry.isMe ? COLORS.gold : COLORS.white }}>
                {entry.name} {entry.isMe ? '(você)' : ''}
              </Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray500 }}>
                {entry.city_name}, {entry.state}
              </Text>
            </View>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: COLORS.gold }}>
              {FORMAT_MAP[type](entry.score)}
            </Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
