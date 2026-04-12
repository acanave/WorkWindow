import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || ''

let supabaseClient = null

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey)
}

export function getSupabaseConfigError() {
  if (isSupabaseConfigured()) return null
  return 'Cloud sync requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(getSupabaseConfigError())
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  }

  return supabaseClient
}
