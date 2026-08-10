import { NavLink } from 'react-router-dom'
import { Compass, Map, Plus, Trophy, User } from 'lucide-react'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { to: '/', label: '발견', icon: Compass, end: true, isCenter: false },
  { to: '/map', label: '지도', icon: Map, end: false, isCenter: false },
  { to: '/upload', label: '업로드', icon: Plus, end: false, isCenter: true },
  { to: '/ranking', label: '랭킹', icon: Trophy, end: false, isCenter: false },
  { to: '/my', label: 'MY', icon: User, end: false, isCenter: false },
] as const

export function BottomNavigation() {
  return (
    <nav className="safe-bottom sticky bottom-0 z-30 border-t border-neutral-100 bg-white/95 backdrop-blur">
      <div className="flex items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, isCenter }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px]"
          >
            {({ isActive }) =>
              isCenter ? (
                <>
                  <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white">
                    <Icon size={22} />
                  </span>
                  <span className={clsx('font-medium', isActive ? 'text-primary-600' : 'text-neutral-400')}>
                    {label}
                  </span>
                </>
              ) : (
                <>
                  <Icon size={22} className={isActive ? 'text-primary-600' : 'text-neutral-400'} />
                  <span className={clsx('font-medium', isActive ? 'text-primary-600' : 'text-neutral-400')}>
                    {label}
                  </span>
                </>
              )
            }
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
