import { Leaf } from 'lucide-react'
import { clsx } from 'clsx'

// 나뭇잎 수량 표시 — 과도한 이모지 대신 프로젝트 아이콘(Leaf)으로 통일.
export function LeafAmount({
  value,
  size = 14,
  showSign = false,
  className,
}: {
  value: number
  size?: number
  showSign?: boolean
  className?: string
}) {
  const text = showSign && value > 0 ? `+${value}` : `${value}`
  return (
    <span className={clsx('inline-flex items-center gap-1 font-semibold text-primary-700', className)}>
      <Leaf size={size} />
      {text}
    </span>
  )
}
