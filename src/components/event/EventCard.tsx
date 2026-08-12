import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import type { PhotoEvent } from '@/types'
import { getEventStatus } from '@/types'
import { useEventEntries } from '@/hooks'
import { statusDLabel, statusLabel } from '@/features/event/format'

// 상태별 CTA 문구 — 상세 페이지의 실제 CTA와 동일한 어휘.
function ctaLabel(status: ReturnType<typeof getEventStatus>): string {
  switch (status) {
    case 'SUBMISSION':
      return '참여하기'
    case 'VOTING':
      return '참여작 투표하기'
    case 'FINISHED':
      return '결과 보기'
    case 'UPCOMING':
      return '자세히 보기'
  }
}

export function EventCard({ event }: { event: PhotoEvent }) {
  const status = getEventStatus(event)
  const { data: entries } = useEventEntries(event.id)
  const topReward = event.rewards.find((r) => r.rank === 1)?.leaves

  const active = status === 'SUBMISSION' || status === 'VOTING'

  return (
    <Link
      to={`/events/${event.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-4 shadow-lg shadow-black/5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-primary-700">{event.label}</span>
        <span
          className={clsx(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
            active ? 'bg-primary-50 text-primary-700' : 'bg-neutral-100 text-neutral-500',
          )}
        >
          {statusLabel(status)}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-bold text-neutral-900">{event.title}</p>
        <p className="text-sm leading-relaxed text-neutral-500">{event.description}</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <span>참여 {entries?.length ?? 0}명</span>
        <span className="text-neutral-300">·</span>
        <span>{statusDLabel(event)}</span>
        {topReward !== undefined && (
          <>
            <span className="text-neutral-300">·</span>
            <span className="text-primary-700">1위 {topReward} RP</span>
          </>
        )}
      </div>

      <span className="mt-1 inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-primary-600 text-sm font-medium text-white">
        {ctaLabel(status)}
        <ChevronRight size={16} />
      </span>
    </Link>
  )
}
