import { Link } from 'react-router-dom'
import { ChevronRight, Leaf } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { useLeafBalance, useLeafTransactions } from '@/hooks'

// MY 페이지용 나뭇잎 요약 카드 — 잔액/등급/이번 달 적립 + 내역 진입.
export function MyLeafCard() {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: balance } = useLeafBalance(userId)
  const { data: txs } = useLeafTransactions(userId)

  const total = balance ?? 0
  const now = new Date()
  const monthGain = (txs ?? [])
    .filter((t) => {
      const d = new Date(t.createdAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && t.amount > 0
    })
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <Link
      to="/my/leaves"
      className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white p-4"
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs text-neutral-400">나의 나뭇잎</span>
        <span className="flex items-center gap-1.5 text-2xl font-bold text-primary-700">
          <Leaf size={20} />
          {total}
        </span>
        {monthGain > 0 && <span className="text-xs text-neutral-400">이번 달 +{monthGain}</span>}
      </div>
      <span className="flex items-center gap-1 text-sm text-neutral-400">
        나뭇잎 내역
        <ChevronRight size={16} />
      </span>
    </Link>
  )
}
