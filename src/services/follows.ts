import { supabaseFollowRepository } from '@/repositories/supabase/followRepository'
import type { FollowRepository } from '@/repositories/types'

export const followService: FollowRepository = supabaseFollowRepository
