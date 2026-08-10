import { supabaseAuthRepository } from '@/repositories/supabase/authRepository'
import type { AuthRepository } from '@/repositories/types'

// mock → supabase 로 교체. 되돌리려면 mockAuthRepository 로 바꾸면 됨.
export const authService: AuthRepository = supabaseAuthRepository
