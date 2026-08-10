import type { ReactNode } from 'react'

interface InfoRowProps {
  label: string
  value: ReactNode
  icon?: ReactNode
}

export function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="flex items-center gap-1.5 text-xs text-neutral-400">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  )
}
