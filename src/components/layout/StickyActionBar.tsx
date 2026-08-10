import type { ReactNode } from 'react'

export function StickyActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="safe-bottom sticky bottom-0 z-20 border-t border-neutral-100 bg-white/95 px-4 pt-3 pb-3 backdrop-blur">
      <div className="flex gap-2">{children}</div>
    </div>
  )
}
