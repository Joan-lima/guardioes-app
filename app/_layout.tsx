import { useEffect } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import { Raleway_400Regular, Raleway_700Bold } from '@expo-google-fonts/raleway';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../constants/theme';
import { InstallPWA } from '../components/ui/InstallPWA';
import '../global.css';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { session, profile, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const inPublicRoute = ['checkin', 'register', 'checkin-confirm'].includes(segments[0] as string);

    if (!session && !inAuth && !inPublicRoute) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && profile) {
      if (profile.status === 'pending' && !inAuth) {
        router.replace('/(auth)/pending');
        return;
      }
      if (profile.status === 'active' && inAuth) {
        router.replace('/(app)/dashboard');
        return;
      }
    }
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const { setSession, setLoading, fetchProfile } = useAuthStore();

  const [fontsLoaded] = useFonts({
    Cinzel_700Bold,
    Raleway_400Regular,
    Raleway_700Bold,
  });

  // Registra Service Worker para PWA (web only)
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile();
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.dark, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.dark } }} />
          <InstallPWA />
        </View>
      </AuthGuard>
    </QueryClientProvider>
  );
}
