import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useReferences, useCurrentEvent } from '@/hooks'
import { EventCard } from '@/components/event/EventCard'
import { Tabs } from '@/components/common/Tabs'
import { ReferenceCard } from '@/components/reference/ReferenceCard'
import { CardGridSkeleton } from '@/components/common/Skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { IconButton } from '@/components/common/IconButton'
import type { DiscoverTab } from '@/repositories/types'
import type { Reference } from '@/types'

const TAB_ITEMS: { value: DiscoverTab; label: string }[] = [
  { value: 'recommended', label: '추천' },
  { value: 'popular', label: '인기' },
  { value: 'nearby', label: '내 주변' },
  { value: 'new', label: '신규' },
]

function ReferenceGrid({ references }: { references: Reference[] | undefined }) {
  if (!references || references.length === 0) return <EmptyState />
  return (
    <div className="grid grid-cols-2 gap-3">
      {references.map((reference) => (
        <ReferenceCard key={reference.id} reference={reference} />
      ))}
    </div>
  )
}

function Section({ title, tab, limit = 6 }: { title: string; tab: DiscoverTab; limit?: number }) {
  const { data, isLoading, isError, refetch } = useReferences(tab)

  return (
    <section className="flex flex-col gap-3 px-4 py-4">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {isLoading && <CardGridSkeleton count={4} />}
      {isError && <ErrorState onRetry={() => refetch()} />}
      {!isLoading && !isError && <ReferenceGrid references={data?.slice(0, limit)} />}
    </section>
  )
}

export function DiscoverPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<DiscoverTab>('recommended')
  const { data, isLoading, isError, refetch } = useReferences(tab)
  const { data: currentEvent } = useCurrentEvent()

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutral-100 bg-white/95 px-4 backdrop-blur">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">RE:FRAME</h1>
        <div className="flex items-center gap-1">
          <IconButton aria-label="검색" onClick={() => navigate('/search')}>
            <Search size={20} />
          </IconButton>
          <IconButton aria-label="알림">
            <Bell size={20} />
          </IconButton>
        </div>
      </header>

      <div className="px-4 py-3">
        <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />
      </div>

      {tab === 'recommended' ? (
        <>
          {currentEvent && (
            <div className="px-4 pt-1">
              <EventCard event={currentEvent} />
            </div>
          )}
          <Section title="오늘의 추천" tab="recommended" />
          <Section title="지금 인기 있는 참고 사진" tab="popular" />
          <Section title="신규 참고 사진" tab="new" />
        </>
      ) : (
        <section className="flex flex-col gap-3 px-4 py-4">
          {isLoading && <CardGridSkeleton />}
          {isError && <ErrorState onRetry={() => refetch()} />}
          {!isLoading && !isError && <ReferenceGrid references={data} />}
        </section>
      )}
    </div>
  )
}
