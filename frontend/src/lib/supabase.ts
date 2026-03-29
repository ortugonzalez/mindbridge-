import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function createNoopSubscription() {
  return { unsubscribe() {} }
}

function createFallbackSupabase() {
  const authError = new Error('Supabase is not configured in this environment.')

  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null }
      },
      async exchangeCodeForSession() {
        return { data: { session: null }, error: null }
      },
      async signInWithPassword() {
        return { data: { user: null, session: null }, error: authError }
      },
      async signInWithOtp() {
        return { data: { user: null, session: null }, error: authError }
      },
      async signUp() {
        return { data: { user: null, session: null }, error: authError }
      },
      async signOut() {
        return { error: null }
      },
      onAuthStateChange() {
        return { data: { subscription: createNoopSubscription() } }
      },
    },
  }
}

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('Supabase env vars missing. Auth features will be disabled.')
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createFallbackSupabase()

export { isSupabaseConfigured }
