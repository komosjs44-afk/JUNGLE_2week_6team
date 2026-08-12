import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { useMyParticipations } from '@/hooks'
import { statusLabel } from '@/features/event/format'

// MY '나의 활동' — 참여한 이벤트 + 수상 기록. 참여 내역이 없으면 렌더하지 않는다.
export function MyEventActivity() {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: parts } = useMyParticipations(userId)

  if (!parts || parts.length === 0) return null

  const winCount = parts.filter((p) => p.awardedLeaves > 0).length

  return (
    <section className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-neutral-900">나의 활동</h2>
        <span className="text-xs text-neutral-400">
          참여 {parts.length} · 수상 {winCount}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {parts.map((p) => (
          <Link
            key={p.entry.id}
            to={p.status === 'FINISHED' ? `/events/${p.event.id}/result` : `/events/${p.event.id}`}
            className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5"
          >
            <img
              src={p.entry.imageUrl}
              alt={p.event.title}
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{p.event.title}</p>
              <p className="text-xs text-neutral-400">
                {p.rank ? `${p.rank}위` : statusLabel(p.status)}
              </p>
            </div>
            {p.awardedLeaves > 0 && (
              <span className="shrink-0 text-xs font-semibold text-primary-700">
                +{p.awardedLeaves} RP
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}
