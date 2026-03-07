import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// URL polyfill só no nativo (web já tem URL nativo)
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// AsyncStorage no nativo, localStorage no web (padrão do Supabase)
async function getStorage() {
  if (Platform.OS === 'web') return undefined;
  const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
  return AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            Platform.OS === 'web' ? undefined : require('@react-native-async-storage/async-storage').default,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:                 string;
          name:               string;
          email:              string;
          cpf:                string | null;
          phone:              string | null;
          city_id:            string | null;
          role:               'ADM' | 'LIDER' | 'MEMBRO';
          status:             'pending' | 'active' | 'inactive' | 'rejected';
          adm_approved_at:    string | null;
          lider_approved_at:  string | null;
          photo_url:          string | null;
          total_pe:           number;
          created_at:         string;
          updated_at:         string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at' | 'total_pe'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      cities: {
        Row: { id: string; name: string; state: string; is_active: boolean; created_at: string };
        Insert: Omit<Database['public']['Tables']['cities']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['cities']['Insert']>;
      };
      events: {
        Row: {
          id:              string;
          group_id:        string | null;
          city_id:         string | null;
          title:           string;
          description:     string | null;
          event_date:      string;
          event_time:      string | null;
          location:        string | null;
          type:            string;
          is_official:     boolean;
          qr_token:        string;
          attendees_count: number;
          created_by:      string;
          cancelled_at:    string | null;
          created_at:      string;
        };
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'qr_token' | 'attendees_count' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['events']['Insert']>;
      };
      check_ins: {
        Row: {
          id:             string;
          event_id:       string;
          user_id:        string | null;
          guest_name:     string | null;
          guest_email:    string | null;
          guest_document: string | null;
          guest_phone:    string | null;
          checked_in_at:  string;
        };
        Insert: Omit<Database['public']['Tables']['check_ins']['Row'], 'id' | 'checked_in_at'>;
        Update: never;
      };
      missions: {
        Row: {
          id:          string;
          title:       string;
          description: string;
          points:      number;
          category:    string;
          target_role: 'ADM' | 'LIDER' | 'MEMBRO';
          is_active:   boolean;
          created_by:  string;
          expires_at:  string | null;
          created_at:  string;
        };
        Insert: Omit<Database['public']['Tables']['missions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['missions']['Insert']>;
      };
      mission_completions: {
        Row: {
          id:               string;
          mission_id:       string;
          user_id:          string;
          status:           'available' | 'completed' | 'validated' | 'rejected';
          validated_by:     string | null;
          validated_at:     string | null;
          rejection_reason: string | null;
          completed_at:     string;
        };
        Insert: Omit<Database['public']['Tables']['mission_completions']['Row'], 'id' | 'completed_at'>;
        Update: Partial<Database['public']['Tables']['mission_completions']['Insert']>;
      };
      channels: {
        Row: {
          id:                      string;
          name:                    string;
          type:                    string;
          city_id:                 string | null;
          is_readonly_for_members: boolean;
          created_at:              string;
        };
        Insert: Omit<Database['public']['Tables']['channels']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['channels']['Insert']>;
      };
      messages: {
        Row: {
          id:         string;
          channel_id: string;
          sender_id:  string;
          content:    string | null;
          type:       string;
          file_url:   string | null;
          file_name:  string | null;
          is_pinned:  boolean;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at' | 'is_pinned' | 'deleted_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      products: {
        Row: {
          id:              string;
          name:            string;
          price:           number;
          commission_rate: number;
          platform:        string;
          sales_page_url:  string | null;
          is_active:       boolean;
          created_at:      string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      sales: {
        Row: {
          id:             string;
          leader_id:      string;
          product_id:     string;
          buyer_name:     string;
          buyer_email:    string;
          buyer_document: string | null;
          value:          number;
          commission:     number;
          platform:       string | null;
          external_id:    string | null;
          status:         string;
          sold_at:        string;
          created_at:     string;
        };
        Insert: Omit<Database['public']['Tables']['sales']['Row'], 'id' | 'created_at' | 'sold_at'>;
        Update: Partial<Database['public']['Tables']['sales']['Insert']>;
      };
      expansion_points: {
        Row: {
          id:             string;
          user_id:        string;
          amount:         number;
          reason:         string;
          reference_id:   string | null;
          reference_type: string | null;
          notes:          string | null;
          created_at:     string;
        };
        Insert: Omit<Database['public']['Tables']['expansion_points']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
    };
    Functions: {
      public_checkin: {
        Args: {
          p_qr_token:   string;
          p_name:       string;
          p_email:      string;
          p_document?:  string;
          p_phone?:     string;
        };
        Returns: { success: boolean; checkin_id?: string; event_title?: string; error?: string };
      };
    };
  };
};
