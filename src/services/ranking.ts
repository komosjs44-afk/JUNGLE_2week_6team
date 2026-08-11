import { supabaseRankingRepository } from '@/repositories/supabase/rankingRepository'
import type { RankingRepository } from '@/repositories/types'

export const rankingService: RankingRepository = supabaseRankingRepository