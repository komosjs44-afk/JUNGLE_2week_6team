import type { ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[480px] flex-col bg-white shadow-[0_0_0_1px_theme(colors.neutral.100)]">
      {children}
    </div>
  )
}
