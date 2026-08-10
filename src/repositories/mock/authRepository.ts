import type { AuthRepository } from '../types'
import type { User } from '@/types'
import { CURRENT_USER } from '@/mocks'
import { mockDelay } from './delay'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const mockAuthRepository: AuthRepository = {
  async login(email, password) {
    if (!EMAIL_RE.test(email)) throw new Error('올바른 이메일 형식이 아니에요.')
    if (password.length < 4) throw new Error('비밀번호는 4자 이상이어야 해요.')
    return mockDelay({ ...CURRENT_USER, email }, 400)
  },

  async signup(nickname, email, password) {
    if (nickname.trim().length < 2) throw new Error('닉네임은 2자 이상이어야 해요.')
    if (!EMAIL_RE.test(email)) throw new Error('올바른 이메일 형식이 아니에요.')
    if (password.length < 4) throw new Error('비밀번호는 4자 이상이어야 해요.')

    const newUser: User = {
      id: `user-${Date.now()}`,
      nickname,
      email,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    }
    return mockDelay(newUser, 400)
  },

  async logout() {
    return mockDelay(undefined, 150)
  },

  async updateProfile(_userId, patch) {
    return mockDelay({ ...CURRENT_USER, ...patch }, 200)
  },
}
