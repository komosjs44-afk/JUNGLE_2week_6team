import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores'

/**
 * 실제 로그인 회원만 통과. 업로드·마이페이지·설정처럼 "회원 전용" 라우트에 쓴다.
 * children 없이 레이아웃 라우트(`<Route element={<RequireAuth />}>`)로 쓰면 Outlet을 렌더한다.
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location, reason: 'member' }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
