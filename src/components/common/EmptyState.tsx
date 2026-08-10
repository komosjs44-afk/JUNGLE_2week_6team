import type { ReactNode } from 'react'
import { ImageOff } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title = '아직 Reference가 없어요.',
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        {icon ?? <ImageOff size={24} />}
      </div>
      <p className="text-sm font-medium text-neutral-700">{title}</p>
      {description && <p className="text-xs text-neutral-400">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="md" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
