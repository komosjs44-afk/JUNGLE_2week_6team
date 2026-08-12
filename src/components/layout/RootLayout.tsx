import { Outlet, useLocation } from 'react-router-dom'
import { AppShell } from './AppShell'
import { BottomNavigation } from '../navigation/BottomNavigation'

const HIDE_NAV_PATTERNS = [
  /^\/spots\/[^/]+$/,
  /^\/references\//,
  /^\/upload/,
  /^\/users\//,
  /^\/scene-match/,
]

function shouldHideNav(pathname: string): boolean {
  return HIDE_NAV_PATTERNS.some((pattern) => pattern.test(pathname))
}

export function RootLayout() {
  const location = useLocation()
  const hideNav = shouldHideNav(location.pathname)

  return (
    <AppShell>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Outlet />
      </main>
      {!hideNav && <BottomNavigation />}
    </AppShell>
  )
}
