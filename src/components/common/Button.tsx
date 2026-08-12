import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  icon,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'lg' ? 'h-13 min-h-[52px] px-6 text-base' : 'h-11 min-h-[44px] px-4 text-sm',
        variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700',
        variant === 'secondary' &&
          'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50',
        variant === 'ghost' && 'text-neutral-700 hover:bg-neutral-100',
        variant === 'danger' && 'bg-danger text-white hover:opacity-90',
        fullWidth && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
