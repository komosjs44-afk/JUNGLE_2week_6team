import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GuestState {
  /** 게스트가 처음 입장할 때 1회 설정한 닉네임. 이후 변경 불가, 재접속 시 그대로 재사용. */
  nickname: string | null
  setNickname: (nickname: string) => void
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      nickname: null,
      // 이미 닉네임이 있으면 덮어쓰지 않음 — "닉네임 변경 불가" 규칙을 스토어 레벨에서도 보장
      setNickname: (nickname) =>
        set((state) => (state.nickname ? state : { nickname: nickname.trim().slice(0, 20) })),
    }),
    { name: 'reframe-guest' },
  ),
)
