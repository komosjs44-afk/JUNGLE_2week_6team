import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useAllReferences, useSpots } from '@/hooks'
import { PageHeader } from '@/components/layout/PageHeader'
import { ReferenceCard } from '@/components/reference/ReferenceCard'
import { SpotCard } from '@/components/spot/SpotCard'
import { EmptyState } from '@/components/common/EmptyState'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const { data: allReferences } = useAllReferences()
  const { data: spots } = useSpots()

  const q = query.trim().toLowerCase()

  const matchedReferences = useMemo(() => {
    if (!allReferences || !q) return []
    return allReferences.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.spot.name.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [allReferences, q])

  const matchedSpots = useMemo(() => {
    if (!spots || !q) return []
    return spots.filter(
      (s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [spots, q])

  const hasResults = matchedReferences.length > 0 || matchedSpots.length > 0

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="검색" />

      <div className="px-4 py-3">
        <div className="flex h-11 items-center gap-2 rounded-xl bg-neutral-100 px-3">
          <Search size={16} className="text-neutral-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장소, 참고 사진, 태그 검색"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 py-2">
        {!q && (
          <EmptyState title="무엇을 찾고 있나요?" description="장소 이름이나 태그로 검색해보세요." />
        )}

        {q && !hasResults && <EmptyState title="검색 결과가 없어요." />}

        {matchedSpots.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-neutral-500">스팟 {matchedSpots.length}</h2>
            <div className="grid grid-cols-2 gap-3">
              {matchedSpots.map((s) => (
                <SpotCard key={s.id} spot={s} />
              ))}
            </div>
          </section>
        )}

        {matchedReferences.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-neutral-500">참고 사진 {matchedReferences.length}</h2>
            <div className="grid grid-cols-2 gap-3">
              {matchedReferences.map((r) => (
                <ReferenceCard key={r.id} reference={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
