import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase as defaultClient } from '../../utils/supabase';

const DEFAULT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const DEFAULT_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY!;

let _supabaseInstance: SupabaseClient = defaultClient;

export async function initSupabase(): Promise<SupabaseClient> {
  return _supabaseInstance;
}

export function getSupabase(): SupabaseClient {
  return _supabaseInstance;
}
