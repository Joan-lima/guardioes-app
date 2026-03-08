// Web version — sem react-native-url-polyfill nem AsyncStorage
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:         string;
          name:       string;
          email:      string;
          cpf:        string | null;
          phone:      string | null;
          city_id:    string | null;
          role:       'ADM' | 'LIDER' | 'MEMBRO';
          status:     'pending' | 'active' | 'rejected' | 'inactive';
          total_pe:   number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at' | 'total_pe'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      cities: {
        Row: { id: string; name: string; state: string; created_at: string };
        Insert: Omit<Database['public']['Tables']['cities']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['cities']['Insert']>;
      };
      channels: {
        Row: { id: string; name: string; type: string; city_id: string | null; is_readonly_for_members: boolean; created_at: string };
        Insert: Omit<Database['public']['Tables']['channels']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['channels']['Insert']>;
      };
      messages: {
        Row: { id: string; channel_id: string; sender_id: string; content: string | null; type: string; created_at: string; deleted_at: string | null };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at' | 'deleted_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      events: {
        Row: { id: string; city_id: string | null; leader_id: string; title: string; event_date: string; event_time: string | null; location: string | null; description: string | null; is_official: boolean; qr_token: string; attendees_count: number; cancelled_at: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'qr_token' | 'attendees_count' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      check_ins: {
        Row: { id: string; event_id: string; guest_name: string; guest_email: string; guest_document: string | null; guest_phone: string | null; checked_in_at: string };
        Insert: Omit<Database['public']['Tables']['check_ins']['Row'], 'id' | 'checked_in_at'>;
        Update: never;
      };
      missions: {
        Row: { id: string; title: string; description: string; points: number; category: string; target_role: 'ADM' | 'LIDER' | 'MEMBRO'; is_active: boolean; created_by: string; created_at: string };
        Insert: Omit<Database['public']['Tables']['missions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['missions']['Insert']>;
      };
      mission_completions: {
        Row: { id: string; mission_id: string; user_id: string; status: 'completed' | 'validated' | 'rejected'; validated_by: string | null; validated_at: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['mission_completions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['mission_completions']['Insert']>;
      };
      expansion_points: {
        Row: { id: string; user_id: string; amount: number; source: string; ref_id: string | null; note: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['expansion_points']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      products: {
        Row: { id: string; name: string; price: number; commission_rate: number; platform: string; is_active: boolean; created_at: string };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      sales: {
        Row: { id: string; leader_id: string; product_id: string; buyer_name: string; buyer_email: string; buyer_document: string | null; value: number; commission: number; platform: string | null; status: string; sold_at: string };
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'sold_at'>;
        Update: Partial<Database['public']['Tables']['sales']['Insert']>;
      };
    };
    Functions: {
      public_checkin: {
        Args: { p_qr_token: string; p_name: string; p_email: string; p_document?: string; p_phone?: string };
        Returns: { success: boolean; checkin_id?: string; error?: string };
      };
    };
  };
};
