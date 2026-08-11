import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import type { ProfileUpdate } from '@/repositories/types'
import { authService } from '@/services'
import { getCurrentUser } from '@/repositories/supabase/authRepository'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  init: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  signup: (nickname: string, email: string, password: string) => Promise<void>
  updateProfile: (patch: ProfileUpdate) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      // 앱 시작 시 Supabase 세션과 동기화 (persist된 user를 실제 세션 기준으로 재확인)
      init: async () => {
        const user = await getCurrentUser()
        set({ user })
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const user = await authService.login(email, password)
          set({ user, isLoading: false })
        } catch (err) {
          // 로그인 실패는 항상 비로그인 상태여야 함 — 이전에 남아있던 user가 있어도 지운다
          set({ user: null, error: err instanceof Error ? err.message : '로그인에 실패했어요.', isLoading: false })
          throw err
        }
      },

      signup: async (nickname, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const user = await authService.signup(nickname, email, password)
          set({ user, isLoading: false })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '회원가입에 실패했어요.', isLoading: false })
          throw err
        }
      },

      updateProfile: async (patch) => {
        const current = useAuthStore.getState().user
        if (!current) return
        set({ isLoading: true, error: null })
        try {
          const user = await authService.updateProfile(current.id, patch)
          set({ user, isLoading: false })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '프로필 수정에 실패했어요.', isLoading: false })
          throw err
        }
      },

      logout: () => {
        void authService.logout()
        set({ user: null })
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'reframe-auth', partialize: (state) => ({ user: state.user }) },
  ),
)
