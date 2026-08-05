import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storageKey: 'sb-auth-token',
  },
})

/**
 * A throwaway Supabase client with no persisted/auto-refreshed session.
 *
 * auth.signUp() on a normal client replaces the *current* session with the
 * newly created user's session. Anywhere an already-authenticated caller
 * (e.g. an admin creating an agent account) needs to sign someone else up
 * without losing their own session, run that signUp() call through a fresh
 * instance from this helper instead of the shared `supabase` client.
 */
export function createEphemeralClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}