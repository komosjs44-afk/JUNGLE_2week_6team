import type { ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface TagProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  as?: 'button' | 'span'
}

export function Tag({ selected, as = 'span', className, children, ...rest }: TagProps) {
  const classes = clsx(
    'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap',
    selected ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-600',
    className,
  )

  if (as === 'span') {
    return <span className={classes}>{children}</span>
  }

  return (
    <button type="button" className={clsx(classes, 'min-h-[32px] transition-colors')} {...rest}>
      {children}
    </button>
  )
}
