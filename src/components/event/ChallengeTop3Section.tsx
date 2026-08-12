import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useLatestChallengeTop3 } from '@/hooks'
import { Avatar } from '@/components/common/Avatar'

// 랭킹 페이지 상단 — 가장 최근 확정(FINISHED) 챌린지의 TOP 3.
// 확정된 이벤트가 없으면(진행 중뿐이면) 렌더하지 않는다 → 미확정 순위 노출 방지.
export function ChallengeTop3Section() {
  const { data } = useLatestChallengeTop3()
  if (!data || data.entries.length === 0) return null

  return (
    <section className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-neutral-900">챌린지 TOP 3</h2>
        <Link to={`/events/${data.event.id}/result`} className="text-xs text-neutral-400">
          {data.event.title}
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {data.entries.map((entry) => (
          <Link
            key={entry.id}
            to={`/events/${data.event.id}/result`}
            className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5"
          >
            <span
              className={clsx(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                entry.rank === 1 ? 'bg-accent text-neutral-900' : 'bg-neutral-100 text-neutral-600',
              )}
            >
              {entry.rank}
            </span>
            <img
              src={entry.imageUrl}
              alt={entry.title}
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{entry.title}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Avatar nickname={entry.creator.nickname} avatarUrl={entry.creator.avatarUrl} size={14} />
                <span className="truncate text-xs text-neutral-400">{entry.creator.nickname}</span>
              </div>
            </div>
            <span className="shrink-0 text-sm font-medium text-neutral-700">{entry.voteCount}표</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
