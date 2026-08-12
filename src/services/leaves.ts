import { mockLeafRepository } from '@/repositories/mock'
import type { LeafRepository } from '@/repositories/types'

// MVP는 mock으로 즉시 동작(인메모리 원장). Supabase 전환 시:
//   1) docs/supabase-events.sql 실행(leaf_transactions 포함)
//   2) 아래를 supabaseLeafRepository 로 교체
// import { supabaseLeafRepository } from '@/repositories/supabase'
export const leafService: LeafRepository = mockLeafRepository
