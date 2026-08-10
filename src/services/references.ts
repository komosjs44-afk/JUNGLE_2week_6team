import { supabaseReferenceRepository } from '@/repositories/supabase/referenceRepository'
import type { ReferenceRepository } from '@/repositories/types'

// mock → supabase 로 교체. 되돌리려면 mockReferenceRepository 로 바꾸면 됨.
export const referenceService: ReferenceRepository = supabaseReferenceRepository
