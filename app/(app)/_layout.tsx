import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { COLORS, FONTS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = 260;

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/(app)/dashboard',  label: 'Dashboard',   icon: '📊', roles: ['ADM', 'LIDER', 'MEMBRO'] },
  { href: '/(app)/events',     label: 'Eventos',      icon: '📅', roles: ['ADM', 'LIDER', 'MEMBRO'] },
  { href: '/(app)/group',      label: 'Meu Grupo',    icon: '👥', roles: ['ADM', 'LIDER'] },
  { href: '/(app)/ranking',    label: 'Ranking',      icon: '🏆', roles: ['ADM', 'LIDER'] },
  { href: '/(app)/community',  label: 'Comunidade',   icon: '💬', roles: ['ADM', 'LIDER', 'MEMBRO'] },
  { href: '/(app)/sales',      label: 'Vendas',       icon: '💰', roles: ['ADM', 'LIDER'] },
  { href: '/(app)/missions',   label: 'Missões',      icon: '🎯', roles: ['ADM', 'LIDER'] },
  { href: '/(app)/admin',      label: 'Admin',        icon: '⚙️', roles: ['ADM'] },
];

export default function AppLayout() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const path    = usePathname();
  const { profile, signOut } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = NAV_ITEMS.filter(item =>
    profile?.role && item.roles.includes(profile.role)
  );

  function navigateTo(href: string) {
    router.push(href as any);
    setSidebarOpen(false);
  }

  const roleLabel = { ADM: 'Administrador', LIDER: 'Líder Regional', MEMBRO: 'Guardião' }[profile?.role ?? 'MEMBRO'];
  const roleBadgeColor = { ADM: COLORS.gold, LIDER: '#60A5FA', MEMBRO: '#A78BFA' }[profile?.role ?? 'MEMBRO'];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark }}>

      {/* Top Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 20,
        backgroundColor: '#171824', borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
      }}>
        <TouchableOpacity onPress={() => setSidebarOpen(true)} style={{ padding: 4 }}>
          <Text style={{ color: COLORS.gray400, fontSize: 22 }}>☰</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: FONTS.title, fontSize: 13, color: COLORS.gold, letterSpacing: 2 }}>
          GUARDIÕES
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11, color: COLORS.gold }}>
              {profile?.total_pe ?? 0} PE
            </Text>
          </View>
          <TouchableOpacity
            style={{
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: `${COLORS.gold}33`,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.gold }}>
              {profile?.name?.charAt(0) ?? '?'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSidebarOpen(false)}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10 }}
        />
      )}

      {/* Sidebar Drawer */}
      <View style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: SIDEBAR_WIDTH, backgroundColor: '#171824',
        borderRightWidth: 1, borderRightColor: COLORS.darkBorder,
        zIndex: 20, paddingTop: insets.top,
        transform: [{ translateX: sidebarOpen ? 0 : -SIDEBAR_WIDTH }],
      }}>
        {/* Profile Section */}
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: `${COLORS.gold}33`, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: `${COLORS.gold}66`,
            }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 18, color: COLORS.gold }}>
                {profile?.name?.charAt(0) ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14, color: COLORS.white }} numberOfLines={1}>
                {profile?.name}
              </Text>
              <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: roleBadgeColor, marginTop: 2 }}>
                {roleLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Navigation */}
        <ScrollView style={{ flex: 1, paddingTop: 12 }}>
          {filteredNav.map((item) => {
            const active = path.includes(item.href.replace('/(app)/', ''));
            return (
              <TouchableOpacity
                key={item.href}
                onPress={() => navigateTo(item.href)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 14, paddingHorizontal: 20,
                  backgroundColor: active ? `${COLORS.gold}1A` : 'transparent',
                  borderRightWidth: active ? 3 : 0,
                  borderRightColor: COLORS.gold,
                  marginBottom: 2,
                }}
              >
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                <Text style={{
                  fontFamily: active ? FONTS.bodyBold : FONTS.body,
                  fontSize: 14,
                  color: active ? COLORS.gold : COLORS.gray400,
                }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={signOut}
          style={{ padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.darkBorder }}
        >
          <Text style={{ fontSize: 18 }}>🚪</Text>
          <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray600 }}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
