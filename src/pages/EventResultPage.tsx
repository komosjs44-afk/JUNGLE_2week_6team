import { useParams } from 'react-router-dom'
import { useEvent, useEventResult } from '@/hooks'
import { getEventStatus } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Avatar } from '@/components/common/Avatar'

export function EventResultPage() {
  const { eventId } = useParams()
  const { data: event } = useEvent(eventId)
  const { data: result, isLoading, isError, refetch } = useEventResult(eventId)

  const status = event ? getEventStatus(event) : undefined
  const winner = result?.[0]
  const rest = result?.slice(1) ?? []

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="결과" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-4">
          {event && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-primary-700">이번 주 결과</span>
              <p className="text-lg font-bold text-neutral-900">{event.title}</p>
            </div>
          )}

          {status && status !== 'FINISHED' ? (
            <EmptyState title="결과는 아직 발표 전이에요." description="결과 발표일 이후에 공개돼요." compact />
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : !winner ? (
            <EmptyState title="참여작이 없어 결과가 없어요." compact />
          ) : (
            <>
              {/* 1위 */}
              <div className="flex flex-col gap-3 rounded-[12px] border border-neutral-100 p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-neutral-900">
                    1위
                  </span>
                  {winner.awardedLeaves > 0 && (
                    <span className="text-base font-semibold text-primary-700">+{winner.awardedLeaves} RP</span>
                  )}
                </div>
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
                  <img src={winner.imageUrl} alt={winner.title} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-base font-bold text-neutral-900">{winner.title}</p>
                  <div className="flex items-center gap-1.5">
                    <Avatar nickname={winner.creator.nickname} avatarUrl={winner.creator.avatarUrl} size={20} />
                    <span className="text-sm text-neutral-500">{winner.creator.nickname}</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-700">{winner.voteCount}표</p>
                </div>
              </div>

              {/* 2위 이하 */}
              {rest.length > 0 && (
                <div className="flex flex-col gap-2">
                  {rest.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2.5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
                        {entry.rank}
                      </span>
                      <img
                        src={entry.imageUrl}
                        alt={entry.title}
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">{entry.title}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Avatar nickname={entry.creator.nickname} avatarUrl={entry.creator.avatarUrl} size={14} />
                          <span className="truncate text-xs text-neutral-400">{entry.creator.nickname}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="text-sm font-medium text-neutral-700">{entry.voteCount}표</span>
                        {entry.awardedLeaves > 0 && (
                          <span className="text-xs font-semibold text-primary-700">+{entry.awardedLeaves} RP</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
