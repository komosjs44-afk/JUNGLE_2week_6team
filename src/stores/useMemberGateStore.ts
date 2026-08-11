import { create } from 'zustand'
import { useAuthStore } from './useAuthStore'

interface MemberGateState {
  open: boolean
  /** 로그인 회원인지 확인 — 아니면(게스트/비로그인) 안내 모달을 띄우고 false를 반환한다. */
  requireMember: () => boolean
  close: () => void
}

// 업로드/저장/마이페이지 등 "회원 전용" 동작을 시도할 때 공통으로 쓰는 게이트.
// 게스트가 저장 버튼 등을 눌러도 조용히 씹히지 않고, 로그인이 필요하다는 걸 바로 알 수 있게 한다.
export const useMemberGateStore = create<MemberGateState>()((set) => ({
  open: false,
  requireMember: () => {
    const isMember = !!useAuthStore.getState().user
    if (!isMember) set({ open: true })
    return isMember
  },
  close: () => set({ open: false }),
}))
