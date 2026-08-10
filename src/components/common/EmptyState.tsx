import type { ReactNode } from 'react'
import { clsx } from 'clsx'
import { ImageOff } from 'lucide-react'
import { Button } from './Button'

export function StateIcon({
  icon,
  tone = 'neutral',
}: {
  icon: ReactNode
  tone?: 'neutral' | 'danger'
}) {
  return (
    <div
      className={clsx(
        'flex h-14 w-14 items-center justify-center rounded-full',
        tone === 'danger' ? 'bg-red-50 text-danger' : 'bg-neutral-100 text-neutral-400',
      )}
    >
      {icon}
    </div>
  )
}

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title = '아직 참고 사진이 없어요.',
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <StateIcon icon={icon ?? <ImageOff size={24} />} />
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
