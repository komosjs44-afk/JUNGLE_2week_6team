import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import { useReferences, useCurrentEvent } from '@/hooks'
import { EventCard } from '@/components/event/EventCard'
import { PhotoGallery } from '@/components/discover/PhotoGallery'
import { Tabs } from '@/components/common/Tabs'
import { CardGridSkeleton } from '@/components/common/Skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { IconButton } from '@/components/common/IconButton'
import type { DiscoverTab } from '@/repositories/types'

const TAB_ITEMS: { value: DiscoverTab; label: string }[] = [
  { value: 'recommended', label: '추천' },
  { value: 'popular', label: '인기' },
  { value: 'nearby', label: '내 주변' },
  { value: 'new', label: '신규' },
]

export function DiscoverPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<DiscoverTab>('recommended')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data, isLoading, isError, refetch } = useReferences(tab)
  const { data: currentEvent } = useCurrentEvent()

  // 탭을 바꾸면 갤러리 데이터가 바뀌므로 열려있던 상세는 닫는다.
  function changeTab(next: DiscoverTab) {
    setTab(next)
    setSelectedId(null)
  }

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
        <Tabs items={TAB_ITEMS} value={tab} onChange={changeTab} />
      </div>

      {tab === 'recommended' && currentEvent && (
        <div className="px-4 pb-3">
          <EventCard event={currentEvent} />
        </div>
      )}

      <div className="px-1 pb-4">
        {isLoading && (
          <div className="px-3">
            <CardGridSkeleton count={6} />
          </div>
        )}
        {isError && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !isError &&
          (!data || data.length === 0 ? (
            <EmptyState />
          ) : (
            <PhotoGallery
              references={data}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onClose={() => setSelectedId(null)}
            />
          ))}
      </div>
    </div>
  )
}
