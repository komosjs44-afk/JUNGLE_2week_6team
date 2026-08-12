import { useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore, useMemberGateStore } from '@/stores'
import { useEvent, useEventEntries, useMyEventEntry } from '@/hooks'
import { getEventStatus } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { ErrorState } from '@/components/common/ErrorState'
import { formatEventDate, statusLabel } from '@/features/event/format'

function periodText(start: string, end: string): string {
  const s = formatEventDate(start)
  const e = formatEventDate(end)
  return s === e ? s : `${s} ~ ${e}`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="text-sm font-medium text-neutral-900">{value}</span>
    </div>
  )
}

export function EventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const requireMember = useMemberGateStore((s) => s.requireMember)
  const userId = useAuthStore((s) => s.user?.id)
  const { data: event, isLoading, isError, refetch } = useEvent(eventId)
  const { data: entries } = useEventEntries(eventId)
  const { data: myEntry } = useMyEventEntry(eventId, userId)

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="챌린지" />
        <div className="flex flex-1 items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (isError || !event) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="챌린지" />
        <ErrorState message="이벤트를 불러오지 못했어요." onRetry={() => refetch()} />
      </div>
    )
  }

  const status = getEventStatus(event)
  const active = status === 'SUBMISSION' || status === 'VOTING'

  function renderCta() {
    if (status === 'SUBMISSION') {
      if (myEntry) {
        return (
          <Button fullWidth disabled>
            참여 완료
          </Button>
        )
      }
      return (
        <Button
          fullWidth
          onClick={() => requireMember() && navigate(`/events/${event!.id}/submit`)}
        >
          사진으로 참여하기
        </Button>
      )
    }
    if (status === 'VOTING') {
      return (
        <Button fullWidth onClick={() => navigate(`/events/${event!.id}/vote`)}>
          참여작 투표하기
        </Button>
      )
    }
    if (status === 'FINISHED') {
      return (
        <Button fullWidth onClick={() => navigate(`/events/${event!.id}/result`)}>
          결과 보기
        </Button>
      )
    }
    return (
      <Button fullWidth disabled>
        예정된 이벤트예요
      </Button>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="챌린지" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 px-4 py-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-primary-700">
                {event.label}
              </span>
              <span
                className={clsx(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                  active ? 'bg-primary-50 text-primary-700' : 'bg-neutral-100 text-neutral-500',
                )}
              >
                {statusLabel(status)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">{event.title}</h1>
            <p className="text-sm leading-relaxed text-neutral-500">{event.description}</p>
          </div>

          <div className="flex flex-col gap-2.5 rounded-xl border border-neutral-100 p-4">
            <InfoRow label="참여 기간" value={periodText(event.submissionStartAt, event.submissionEndAt)} />
            <InfoRow label="투표 기간" value={periodText(event.votingStartAt, event.votingEndAt)} />
            <InfoRow label="결과 발표" value={formatEventDate(event.resultAt)} />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-base font-semibold text-neutral-900">보상</h2>
            <div className="flex flex-col gap-1.5 rounded-xl border border-neutral-100 p-4">
              {event.rewards.map((r) => (
                <div key={r.rank} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-700">{r.rank}위</span>
                  <span className="text-sm font-semibold text-primary-700">{r.leaves} RP</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-neutral-400">참여 {entries?.length ?? 0}명</p>
        </div>
      </div>

      <StickyActionBar>{renderCta()}</StickyActionBar>
    </div>
  )
}
