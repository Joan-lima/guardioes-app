import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Modal, TextInput, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { GoldButton } from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Badge';
import { COLORS, FONTS } from '../../constants/theme';

interface Product { id: string; name: string; price: number; commission_rate: number; platform: string; }
interface Sale { id: string; product_id: string; buyer_name: string; buyer_email: string; value: number; commission: number; platform: string | null; status: string; sold_at: string; }

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const [products, setProducts]     = useState<Product[]>([]);
  const [sales, setSales]           = useState<Sale[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [selProduct, setSelProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({ buyer_name: '', buyer_email: '', buyer_document: '' });

  async function load() {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true),
      supabase.from('sales').select('*').eq('leader_id', profile!.id).order('sold_at', { ascending: false }),
    ]);
    setProducts(p ?? []);
    setSales(s ?? []);
  }

  useEffect(() => { if (profile) load(); }, [profile]);

  const totalSales      = sales.reduce((s, r) => s + r.value, 0);
  const totalCommission = sales.reduce((s, r) => s + r.commission, 0);

  async function registerSale() {
    if (!selProduct || !form.buyer_name || !form.buyer_email) {
      Alert.alert('Atenção', 'Produto, nome e e-mail são obrigatórios');
      return;
    }
    setSaving(true);
    const commission = (selProduct.price * selProduct.commission_rate) / 100;
    const { error } = await supabase.from('sales').insert({
      leader_id:      profile!.id,
      product_id:     selProduct.id,
      buyer_name:     form.buyer_name,
      buyer_email:    form.buyer_email.toLowerCase(),
      buyer_document: form.buyer_document || null,
      value:          selProduct.price,
      commission,
      platform:       selProduct.platform,
    });
    setSaving(false);
    if (error) { Alert.alert('Erro', error.message); return; }
    setShowModal(false);
    setForm({ buyer_name: '', buyer_email: '', buyer_document: '' });
    setSelProduct(null);
    load();
  }

  const inputStyle = { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.white, fontFamily: FONTS.body, fontSize: 14 };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={COLORS.gold} />}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontFamily: FONTS.title, fontSize: 24, color: COLORS.white }}>Vendas</Text>
          <GoldButton onPress={() => setShowModal(true)} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
            + Registrar
          </GoldButton>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <StatCard title="Total Vendido" value={`R$ ${totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="valor bruto" icon={<Text>🛍️</Text>} />
          <StatCard title="Comissões" value={`R$ ${totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} sub="60% de comissão" trend={sales.length > 0 ? `+${sales.length}` : undefined} icon={<Text>💰</Text>} />
        </View>

        {/* Products */}
        <Text style={{ fontFamily: FONTS.title, fontSize: 16, color: COLORS.white, marginBottom: 12 }}>Produtos Oficiais</Text>
        {products.map(p => (
          <Card key={p.id} style={{ marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Badge label={p.platform} variant="blue" />
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white, marginTop: 6 }}>{p.name}</Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray400 }}>
                R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.gold }}>{p.commission_rate}%</Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.gray500 }}>comissão</Text>
            </View>
          </Card>
        ))}

        {/* Sales list */}
        <Text style={{ fontFamily: FONTS.title, fontSize: 16, color: COLORS.white, marginTop: 20, marginBottom: 12 }}>
          Histórico de Vendas
        </Text>
        {sales.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>💼</Text>
            <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>Nenhuma venda registrada.</Text>
          </View>
        ) : (
          sales.map(s => (
            <Card key={s.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }}>{s.buyer_name}</Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray500 }}>{s.buyer_email}</Text>
                  <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray600, marginTop: 2 }}>
                    {new Date(s.sold_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Badge label={s.status} variant={s.status === 'confirmed' ? 'green' : 'yellow'} />
                  <Text style={{ fontFamily: FONTS.title, fontSize: 16, color: COLORS.gold }}>
                    + R$ {s.commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: COLORS.dark, padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
            <Text style={{ fontFamily: FONTS.title, fontSize: 20, color: COLORS.white }}>Registrar Venda</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}><Text style={{ color: COLORS.gray400, fontSize: 24 }}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <View style={{ gap: 14 }}>
              <View>
                <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Produto *</Text>
                <View style={{ gap: 8 }}>
                  {products.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelProduct(p)}
                      style={{ padding: 14, borderRadius: 10, borderWidth: 1.5, borderColor: selProduct?.id === p.id ? COLORS.gold : 'rgba(255,255,255,0.1)', backgroundColor: selProduct?.id === p.id ? `${COLORS.gold}1A` : 'rgba(255,255,255,0.05)', flexDirection: 'row', justifyContent: 'space-between' }}
                    >
                      <Text style={{ fontFamily: FONTS.bodyBold, color: selProduct?.id === p.id ? COLORS.gold : COLORS.white }}>{p.name}</Text>
                      <Text style={{ fontFamily: FONTS.body, color: COLORS.gray400 }}>R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {[
                { label: 'Nome do Comprador *', key: 'buyer_name', placeholder: 'Nome completo' },
                { label: 'E-mail do Comprador *', key: 'buyer_email', placeholder: 'email@exemplo.com' },
                { label: 'CPF (opcional)', key: 'buyer_document', placeholder: '000.000.000-00' },
              ].map(({ label, key, placeholder }) => (
                <View key={key}>
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gray400, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{label}</Text>
                  <TextInput value={(form as any)[key]} onChangeText={t => setForm(f => ({ ...f, [key]: t }))} placeholder={placeholder} placeholderTextColor={COLORS.gray600} style={inputStyle} keyboardType={key === 'buyer_email' ? 'email-address' : 'default'} autoCapitalize="none" />
                </View>
              ))}
              <GoldButton onPress={registerSale} loading={saving} style={{ marginTop: 8 }}>Confirmar Venda</GoldButton>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
