import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'default' | 'filled'
}

export function IconButton({ children, variant = 'default', className, ...rest }: IconButtonProps) {
  return (
    <button
      className={clsx(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95',
        variant === 'default' && 'text-neutral-900 hover:bg-neutral-100',
        variant === 'filled' && 'bg-white/90 text-neutral-900 shadow-sm backdrop-blur hover:bg-white',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
