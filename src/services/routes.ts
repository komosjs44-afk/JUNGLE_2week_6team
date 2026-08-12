import { supabaseRouteRepository } from '@/repositories/supabase/routeRepository'
import type { RouteRepository } from '@/repositories/types'

// mock → supabase 로 교체. 되돌리려면 mockRouteRepository 로 바꾸면 됨.
export const routeService: RouteRepository = supabaseRouteRepository
