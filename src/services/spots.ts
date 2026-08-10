import { supabaseSpotRepository } from '@/repositories/supabase/spotRepository'
import type { SpotRepository } from '@/repositories/types'

// mock → supabase 로 교체. 되돌리려면 mockSpotRepository 로 바꾸면 됨.
export const spotService: SpotRepository = supabaseSpotRepository
