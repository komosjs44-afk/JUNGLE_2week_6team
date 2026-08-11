import type { SaveRepository } from '../types'
import { supabase } from '@/lib/supabase'

const DUPLICATE = '23505' // unique 위반(이미 저장됨) → 무시

interface SavedSpotRow {
  spot_id: string
}

interface SavedReferenceRow {
  reference_id: string
}

export const supabaseSaveRepository: SaveRepository = {
  async listSpotIds(userId) {
    const { data, error } = await supabase.from('saved_spots').select('spot_id').eq('user_id', userId)
    if (error) throw error
    return (data as SavedSpotRow[]).map((r) => r.spot_id)
  },

  async listReferenceIds(userId) {
    const { data, error } = await supabase
      .from('saved_references')
      .select('reference_id')
      .eq('user_id', userId)
    if (error) throw error
    return (data as SavedReferenceRow[]).map((r) => r.reference_id)
  },

  async addSpot(userId, spotId) {
    const { error } = await supabase.from('saved_spots').insert({ user_id: userId, spot_id: spotId })
    if (error && error.code !== DUPLICATE) throw error
  },

  async removeSpot(userId, spotId) {
    const { error } = await supabase
      .from('saved_spots')
      .delete()
      .eq('user_id', userId)
      .eq('spot_id', spotId)
    if (error) throw error
  },

  async addReference(userId, referenceId) {
    const { error } = await supabase
      .from('saved_references')
      .insert({ user_id: userId, reference_id: referenceId })
    if (error && error.code !== DUPLICATE) throw error
  },

  async removeReference(userId, referenceId) {
    const { error } = await supabase
      .from('saved_references')
      .delete()
      .eq('user_id', userId)
      .eq('reference_id', referenceId)
    if (error) throw error
  },
}
