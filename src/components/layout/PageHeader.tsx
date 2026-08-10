import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '../common/IconButton'

interface PageHeaderProps {
  title?: string
  onBack?: () => void
  showBack?: boolean
  right?: ReactNode
  transparent?: boolean
}

export function PageHeader({ title, onBack, showBack = true, right, transparent }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header
      className={`sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between px-2 ${
        transparent ? 'bg-transparent' : 'border-b border-neutral-100 bg-white/95 backdrop-blur'
      }`}
    >
      <div className="flex w-11 items-center">
        {showBack && (
          <IconButton onClick={() => (onBack ? onBack() : navigate(-1))} aria-label="뒤로 가기">
            <ChevronLeft size={22} />
          </IconButton>
        )}
      </div>
      {title && <h1 className="flex-1 truncate text-center text-base font-semibold text-neutral-900">{title}</h1>}
      <div className="flex min-w-[44px] items-center justify-end">{right}</div>
    </header>
  )
}
