import { useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useAuthStore, useMemberGateStore } from '@/stores'
import { useEvent, useEventEntries, useMyEventVotes, useVoteEntry } from '@/hooks'
import { getEventStatus } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { CardGridSkeleton } from '@/components/common/Skeleton'

// VOTING 상태 전용 — 작성자(닉네임/프로필)를 숨긴 블라인드 투표.
export function EventVotePage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const requireMember = useMemberGateStore((s) => s.requireMember)
  const { data: event } = useEvent(eventId)
  const { data: entries, isLoading, isError, refetch } = useEventEntries(eventId)
  const { data: myVotes } = useMyEventVotes(eventId, user?.id)
  const vote = useVoteEntry()

  const status = event ? getEventStatus(event) : undefined
  const votesPerUser = event?.votesPerUser ?? 1
  const votedIds = myVotes ?? []
  const votesLeft = votesPerUser - votedIds.length

  function handleVote(entryId: string) {
    if (!requireMember() || !user) return
    vote.mutate({ eventId: eventId as string, entryId, userId: user.id })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="참여작 투표" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-4">
          {event && (
            <div className="flex flex-col gap-1">
              <p className="text-lg font-bold text-neutral-900">{event.title}</p>
              <p className="text-sm text-neutral-500">
                작성자는 공개되지 않아요. 사진 자체로 판단해 한 표를 던져주세요. (최대 {votesPerUser}표)
              </p>
            </div>
          )}

          {status && status !== 'VOTING' ? (
            <EmptyState
              title={status === 'FINISHED' ? '투표가 마감됐어요.' : '아직 투표 기간이 아니에요.'}
              description={status === 'FINISHED' ? '결과를 확인해보세요.' : undefined}
              actionLabel={status === 'FINISHED' ? '결과 보기' : undefined}
              onAction={status === 'FINISHED' ? () => navigate(`/events/${eventId}/result`) : undefined}
              compact
            />
          ) : isLoading ? (
            <CardGridSkeleton />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : !entries || entries.length === 0 ? (
            <EmptyState title="아직 참여작이 없어요." compact />
          ) : (
            <>
              {vote.isError && (
                <p className="text-sm text-danger">
                  {vote.error instanceof Error ? vote.error.message : '투표에 실패했어요.'}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {entries.map((entry) => {
                  const isMine = entry.userId === user?.id
                  const votedThis = votedIds.includes(entry.id)
                  const canVote = !isMine && !votedThis && votesLeft > 0
                  return (
                    <div key={entry.id} className="flex flex-col gap-2">
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
                        <img
                          src={entry.imageUrl}
                          alt="참여 사진"
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      {votedThis ? (
                        <Button size="md" variant="secondary" fullWidth disabled icon={<Check size={15} />}>
                          투표함
                        </Button>
                      ) : isMine ? (
                        <Button size="md" variant="secondary" fullWidth disabled>
                          내 작품
                        </Button>
                      ) : (
                        <Button
                          size="md"
                          variant={canVote ? 'primary' : 'secondary'}
                          fullWidth
                          disabled={!canVote || vote.isPending}
                          onClick={() => handleVote(entry.id)}
                        >
                          {votesLeft > 0 ? '이 사진에 투표' : '투표 완료'}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
