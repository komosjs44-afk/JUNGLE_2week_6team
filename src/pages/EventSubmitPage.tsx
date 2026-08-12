import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuthStore } from '@/stores'
import { useAllReferences, useEvent, useMyEventEntry, useSubmitEventEntry } from '@/hooks'
import { getEventStatus } from '@/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { CardGridSkeleton } from '@/components/common/Skeleton'

// 새 업로드 시스템을 따로 만들지 않고, 이미 업로드된 "내 참고 사진"을 골라 이벤트에 연결한다.
export function EventSubmitPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { data: event } = useEvent(eventId)
  const { data: allRefs, isLoading } = useAllReferences()
  const { data: myEntry } = useMyEventEntry(eventId, user?.id)
  const submit = useSubmitEventEntry()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const myRefs = useMemo(
    () => allRefs?.filter((r) => r.userId === user?.id) ?? [],
    [allRefs, user],
  )

  if (!user) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader title="사진으로 참여" />
        <EmptyState
          title="로그인이 필요해요."
          description="이벤트 참여는 회원만 가능해요."
          actionLabel="로그인하러 가기"
          onAction={() => navigate('/login')}
        />
      </div>
    )
  }

  const notOpen = event && getEventStatus(event) !== 'SUBMISSION'

  function handleSubmit() {
    const ref = myRefs.find((r) => r.id === selectedId)
    if (!ref || !event) return
    submit.mutate(
      {
        eventId: event.id,
        userId: user!.id,
        photoId: ref.id,
        imageUrl: ref.imageUrl,
        title: ref.title,
        creator: ref.creator,
      },
      { onSuccess: () => navigate(`/events/${event.id}`, { replace: true }) },
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="사진으로 참여" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-4 py-4">
          {event && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-primary-700">
                {event.label}
              </span>
              <p className="text-lg font-bold text-neutral-900">{event.title}</p>
              <p className="text-sm text-neutral-500">
                내가 올린 참고 사진 중 하나를 골라 이벤트에 출품해요. (이벤트당 1회)
              </p>
            </div>
          )}

          {myEntry ? (
            <EmptyState title="이미 이 이벤트에 참여했어요." compact />
          ) : notOpen ? (
            <EmptyState title="지금은 참여 기간이 아니에요." compact />
          ) : isLoading ? (
            <CardGridSkeleton />
          ) : myRefs.length === 0 ? (
            <EmptyState
              title="참여할 사진이 없어요."
              description="먼저 참고 사진을 업로드해보세요."
              actionLabel="사진 업로드"
              onAction={() => navigate('/upload')}
              compact
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {myRefs.map((r) => {
                const selected = selectedId === r.id
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={clsx(
                      'relative aspect-square overflow-hidden rounded-lg border-2',
                      selected ? 'border-primary-600' : 'border-transparent',
                    )}
                  >
                    <img src={r.imageUrl} alt={r.title} className="h-full w-full object-cover" />
                    {selected && (
                      <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white">
                        <Check size={13} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {submit.isError && (
            <p className="text-sm text-danger">
              {submit.error instanceof Error ? submit.error.message : '참여에 실패했어요.'}
            </p>
          )}
        </div>
      </div>

      {!myEntry && !notOpen && myRefs.length > 0 && (
        <StickyActionBar>
          <Button
            fullWidth
            disabled={!selectedId}
            loading={submit.isPending}
            onClick={handleSubmit}
          >
            이 사진으로 참여
          </Button>
        </StickyActionBar>
      )}
    </div>
  )
}
