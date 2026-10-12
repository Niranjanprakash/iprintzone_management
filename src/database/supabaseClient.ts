import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase as defaultClient } from '../../utils/supabase';

const STORAGE_URL_KEY = 'iprintzone_supabase_url';
const STORAGE_KEY_KEY = 'iprintzone_supabase_anon_key';

const DEFAULT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pntnrpnqqnoejgyygtkc.supabase.co';
const DEFAULT_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_FYSfx-1GdfAAod_z0GbSbQ_lpOUfXMX';

let _supabaseInstance: SupabaseClient = defaultClient;
let _currentUrl = DEFAULT_URL;
let _currentKey = DEFAULT_ANON_KEY;

export async function initSupabase(): Promise<SupabaseClient> {
  try {
    const savedUrl = await AsyncStorage.getItem(STORAGE_URL_KEY);
    const savedKey = await AsyncStorage.getItem(STORAGE_KEY_KEY);
    if (savedUrl && savedKey) {
      _currentUrl = savedUrl;
      _currentKey = savedKey;
      _supabaseInstance = createClient(_currentUrl, _currentKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
    }
  } catch (e) {
    console.warn('Could not read saved Supabase credentials:', e);
  }

  return _supabaseInstance;
}

export function getSupabase(): SupabaseClient {
  return _supabaseInstance;
}

export async function setSupabaseCredentials(url: string, anonKey: string): Promise<boolean> {
  try {
    const testClient = createClient(url.trim(), anonKey.trim());
    await testClient.from('jobs').select('id').limit(1);
    _currentUrl = url.trim();
    _currentKey = anonKey.trim();
    await AsyncStorage.setItem(STORAGE_URL_KEY, _currentUrl);
    await AsyncStorage.setItem(STORAGE_KEY_KEY, _currentKey);
    _supabaseInstance = testClient;
    return true;
  } catch (err) {
    console.error('Failed to configure Supabase:', err);
    return false;
  }
}

export async function getSavedSupabaseConfig(): Promise<{ url: string; anonKey: string; isConfigured: boolean }> {
  try {
    const savedUrl = await AsyncStorage.getItem(STORAGE_URL_KEY);
    const savedKey = await AsyncStorage.getItem(STORAGE_KEY_KEY);
    const url = savedUrl || _currentUrl;
    const anonKey = savedKey || _currentKey;
    return { url, anonKey, isConfigured: true };
  } catch {
    return { url: _currentUrl, anonKey: _currentKey, isConfigured: true };
  }
}
