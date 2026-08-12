import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { LoginRequiredPage } from '@/pages/LoginRequiredPage'

/**
 * 실제 로그인 회원만 통과. 업로드·마이페이지·설정처럼 "회원 전용" 라우트에 쓴다.
 * children 없이 레이아웃 라우트(`<Route element={<RequireAuth />}>`)로 쓰면 Outlet을 렌더한다.
 *
 * 회원이 아니면(게스트) 로그인 화면으로 곧장 보내지 않고, 먼저 안내 페이지를 보여줘서
 * 로그인/회원가입/넘어가기를 고르게 한다. (RequireSession 안에 있어 여기 닿는 비회원 = 게스트)
 */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <LoginRequiredPage />
  }

  return children ? <>{children}</> : <Outlet />
}
