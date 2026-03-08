import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole   = 'ADM' | 'LIDER' | 'MEMBRO';
export type UserStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export interface Profile {
  id:       string;
  name:     string;
  email:    string;
  document?: string;
  phone?:   string;
  city_id?: string;
  role:     UserRole;
  status:   UserStatus;
  total_pe: number;
}

interface AuthState {
  session:      Session | null;
  profile:      Profile | null;
  loading:      boolean;
  setSession:   (session: Session | null) => void;
  setProfile:   (profile: Profile | null) => void;
  setLoading:   (loading: boolean) => void;
  fetchProfile: () => Promise<void>;
  signOut:      () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) set({ profile: data as Profile });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
