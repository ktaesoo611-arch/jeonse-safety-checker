import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// For scripts: load dotenv if .env.local exists
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });
  } catch (e) {
    // dotenv not available or .env.local doesn't exist
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key (only available on server)
export const supabaseAdmin = typeof window === 'undefined'
  ? createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null as any; // Not available on client side

// Database types (auto-generated from Supabase)
export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string;
          address: string;
          city: string;
          district: string;
          dong: string;
          building_number: string | null;
          floor: number | null;
          unit: string | null;
          building_name: string | null;
          building_year: number | null;
          exclusive_area: number | null;
          total_floors: number | null;
          estimated_value_low: number | null;
          estimated_value_mid: number | null;
          estimated_value_high: number | null;
          last_analyzed: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          address: string;
          city: string;
          district: string;
          dong: string;
          building_number?: string | null;
          floor?: number | null;
          unit?: string | null;
          building_name?: string | null;
          building_year?: number | null;
          exclusive_area?: number | null;
          total_floors?: number | null;
          estimated_value_low?: number | null;
          estimated_value_mid?: number | null;
          estimated_value_high?: number | null;
          last_analyzed?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          address?: string;
          city?: string;
          district?: string;
          dong?: string;
          building_number?: string | null;
          floor?: number | null;
          unit?: string | null;
          building_name?: string | null;
          building_year?: number | null;
          exclusive_area?: number | null;
          total_floors?: number | null;
          estimated_value_low?: number | null;
          estimated_value_mid?: number | null;
          estimated_value_high?: number | null;
          last_analyzed?: string;
          created_at?: string;
        };
      };
      analysis_results: {
        Row: {
          id: string;
          user_id: string | null;
          property_id: string;
          proposed_jeonse: number;
          safety_score: number | null;
          risk_level: string | null;
          deunggibu_data: any | null;
          risks: any | null;
          status: string;
          payment_amount: number | null;
          payment_status: string | null;
          payment_key: string | null;
          created_at: string;
          completed_at: string | null;
        };
      };
    };
  };
};
