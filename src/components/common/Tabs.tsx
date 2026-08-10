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
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          type="button"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
          className={clsx(
            'min-h-[40px] shrink-0 rounded-full px-4 text-sm font-medium transition-colors',
            value === item.value
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-500 hover:bg-neutral-100',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
