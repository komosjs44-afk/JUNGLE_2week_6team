import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { authService } from '@/services'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (nickname: string, email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const user = await authService.login(email, password)
          set({ user, isLoading: false })
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '로그인에 실패했어요.', isLoading: false })
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

      logout: () => {
        void authService.logout()
        set({ user: null })
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'reframe-auth', partialize: (state) => ({ user: state.user }) },
  ),
)
