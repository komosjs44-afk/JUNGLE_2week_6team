import { clsx } from 'clsx'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  'aria-label'?: string
}

export function Switch({ checked, onChange, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-primary-600' : 'bg-neutral-200',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
