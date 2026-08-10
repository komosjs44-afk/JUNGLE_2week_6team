import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSpots } from '@/hooks'
import { MockMap } from '@/components/map/MockMap'
import { SpotPreviewCard } from '@/components/map/SpotPreviewCard'
import { Tag } from '@/components/common/Tag'
import { ErrorState } from '@/components/common/ErrorState'

const FILTERS = ['전체', '야경', '노을', '골목', '카페', '자연']

export function MapPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('전체')
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const { data: spots, isError, refetch } = useSpots(search || undefined)

  const filteredSpots = useMemo(() => {
    if (!spots) return []
    if (filter === '전체') return spots
    return spots.filter((s) => s.tags.includes(filter))
  }, [spots, filter])

  const selectedSpot = filteredSpots.find((s) => s.id === selectedSpotId) ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="flex h-11 items-center gap-2 rounded-xl bg-neutral-100 px-3">
          <Search size={16} className="text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="장소, 태그 검색"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <Tag key={f} as="button" selected={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Tag>
          ))}
        </div>
      </div>

      <div className="relative flex-1">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <MockMap spots={filteredSpots} selectedSpotId={selectedSpotId} onSelectSpot={setSelectedSpotId} />
        )}

        {selectedSpot && (
          <div className="absolute right-0 bottom-3 left-0 px-3">
            <SpotPreviewCard spot={selectedSpot} />
          </div>
        )}
      </div>
    </div>
  )
}
