import { getSupabaseClient } from '../lib/supabase'
import { normalizeState } from './schema'

const USER_STATES_TABLE = 'user_states'

export async function fetchRemoteState(userId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from(USER_STATES_TABLE).select('state').eq('user_id', userId).maybeSingle()

  if (error) {
    throw error
  }

  return data?.state ? normalizeState(data.state) : null
}

export async function saveRemoteState(userId, state) {
  const supabase = getSupabaseClient()
  const payload = {
    user_id: userId,
    state: normalizeState(state),
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from(USER_STATES_TABLE).upsert(payload, { onConflict: 'user_id' })

  if (error) {
    throw error
  }
}
