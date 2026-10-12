import { getSupabase } from './supabaseClient';

export { getSupabase };

/**
 * Returns true if Supabase client is ready
 */
export async function getDB() {
  return getSupabase();
}

export function resetDBForTesting(): void {
  // No-op for cloud Supabase
}
