import type { AuthRepository } from '../types'
import type { User } from '@/types'
import { supabase } from '@/lib/supabase'

interface ProfileRow {
  id: string
  nickname: string
  email: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  created_at: string
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    nickname: row.nickname,
    email: row.email ?? '',
    avatarUrl: row.avatar_url,
    bio: row.bio ?? undefined,
    website: row.website ?? undefined,
    createdAt: row.created_at,
  }
}

async function fetchProfile(userId: string): Promise<User> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return toUser(data as ProfileRow)
}

// Supabase 영어 에러 메시지 → 한국어
function toKoreanError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않아요.'
  if (m.includes('already registered')) return '이미 가입된 이메일이에요.'
  if (m.includes('password should be at least')) return '비밀번호는 6자 이상이어야 해요.'
  if (m.includes('email not confirmed')) return '이메일 인증이 필요해요.'
  return message
}

export const supabaseAuthRepository: AuthRepository = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(toKoreanError(error.message))
    return fetchProfile(data.user.id)
  },

  async signup(nickname, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname } }, // 트리거(handle_new_user)가 이 nickname으로 profiles 생성
    })
    if (error) throw new Error(toKoreanError(error.message))
    if (!data.user) throw new Error('회원가입에 실패했어요.')
    return fetchProfile(data.user.id)
  },

  async logout() {
    await supabase.auth.signOut()
  },
}

// 앱 시작 시 세션 복원용: 저장된 Supabase 세션이 있으면 그 사용자를 돌려줌
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) return null
  try {
    return await fetchProfile(data.session.user.id)
  } catch {
    return null
  }
}
