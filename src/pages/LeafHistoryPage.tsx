import { Leaf } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { useLeafBalance, useLeafTransactions } from '@/hooks'
import type { LeafReason } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { ListRowSkeleton } from '@/components/common/Skeleton'
import { LeafAmount } from '@/components/leaf/LeafAmount'
import { formatEventDate } from '@/features/event/format'

const REASON_LABEL: Record<LeafReason, string> = {
  EVENT_PARTICIPATE: '이벤트 참여',
  WEEKLY_CHALLENGE_WINNER: '주간 챌린지 수상',
  FIRST_PHOTO_UPLOAD: '첫 사진 업로드',
  FIRST_SPOT_REGISTER: '스팟 최초 등록',
}

export function LeafHistoryPage() {
  const user = useAuthStore((s) => s.user)
  const { data: balance } = useLeafBalance(user?.id)
  const { data: txs, isLoading, isError, refetch } = useLeafTransactions(user?.id)

  if (!user) return null

  const total = balance ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="나뭇잎 내역" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col items-center gap-1 rounded-[12px] border border-neutral-100 py-6">
            <span className="text-xs text-neutral-400">현재 나뭇잎</span>
            <span className="flex items-center gap-1.5 text-3xl font-bold text-primary-700">
              <Leaf size={26} />
              {total}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col">
              <ListRowSkeleton />
              <ListRowSkeleton />
              <ListRowSkeleton />
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : !txs || txs.length === 0 ? (
            <EmptyState
              title="아직 획득한 나뭇잎이 없어요."
              description="이벤트에 참여하면 나뭇잎을 받을 수 있어요."
              compact
            />
          ) : (
            <div className="flex flex-col">
              {txs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 border-b border-neutral-100 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{tx.label}</p>
                    <p className="text-xs text-neutral-400">
                      {formatEventDate(tx.createdAt)} · {REASON_LABEL[tx.reason]}
                    </p>
                  </div>
                  <LeafAmount value={tx.amount} showSign />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
