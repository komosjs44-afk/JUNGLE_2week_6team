import { clsx } from 'clsx'

interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
  return (
    <div className={clsx('no-scrollbar flex gap-1 overflow-x-auto', className)} role="tablist">
      {items.map((item) => {
        const selected = value === item.value
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={clsx(
              'relative shrink-0 px-3 pt-1 pb-2 text-sm transition-colors',
              selected
                ? 'font-semibold text-primary-600'
                : 'font-medium text-neutral-400 hover:text-neutral-600',
            )}
          >
            {item.label}
            {selected && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary-600" />
            )}
          </button>
        )
      })}
    </div>
  )
}
