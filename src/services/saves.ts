import { supabaseSaveRepository } from '@/repositories/supabase/saveRepository'
import type { SaveRepository } from '@/repositories/types'

export const saveService: SaveRepository = supabaseSaveRepository
