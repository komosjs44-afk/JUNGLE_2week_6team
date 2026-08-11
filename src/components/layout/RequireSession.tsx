import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore, useGuestStore } from '@/stores'

/**
 * 로그인 회원 또는 닉네임을 정한 게스트면 통과. 앱의 "조회 가능" 영역 전체(RootLayout)를 감싼다.
 * 업로드·마이페이지 등 진짜 회원만 되는 라우트는 이 안에서 RequireAuth로 한 번 더 감싼다.
 */
export function RequireSession() {
  const user = useAuthStore((s) => s.user)
  const guestNickname = useGuestStore((s) => s.nickname)
  const location = useLocation()

  if (!user && !guestNickname) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
