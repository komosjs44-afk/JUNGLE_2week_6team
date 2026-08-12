import { mockEventRepository } from '@/repositories/mock'
import type { EventRepository } from '@/repositories/types'

// MVP는 mock으로 즉시 동작한다. Supabase 실서버로 전환하려면:
//   1) docs/supabase-events.sql 을 Supabase SQL Editor에서 실행
//   2) 아래를 supabaseEventRepository 로 교체
// import { supabaseEventRepository } from '@/repositories/supabase'
export const eventService: EventRepository = mockEventRepository
