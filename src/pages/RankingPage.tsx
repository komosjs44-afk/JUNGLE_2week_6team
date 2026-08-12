import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Images, MapPin } from 'lucide-react'
import { clsx } from 'clsx'
import { useRanking } from '@/hooks'
import type { RankingTab } from '@/types'
import { Tabs } from '@/components/common/Tabs'
import { Tag } from '@/components/common/Tag'
import { ListRowSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { ChallengeTop3Section } from '@/components/event/ChallengeTop3Section'
import { formatLikeCount } from '@/utils/format'

const TAB_ITEMS: { value: RankingTab; label: string }[] = [
  { value: 'top10', label: 'TOP 10' },
  { value: 'rising', label: '급상승' },
  { value: 'new', label: '신규' },
]

const THEMES = ['전체', '노을', '야경', '한옥', '자연', '골목']

export function RankingPage() {
  const [tab, setTab] = useState<RankingTab>('top10')
  const [theme, setTheme] = useState('전체')
  const { data, isLoading, isError, refetch } = useRanking(tab)

  const entries = useMemo(() => {
    if (!data) return []
    const sliced = tab === 'top10' ? data.slice(0, 10) : data
    if (theme === '전체') return sliced
    return sliced.filter((e) => e.tags.includes(theme))
  }, [data, tab, theme])

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="mb-3 text-xl font-bold text-neutral-900">랭킹</h1>
        <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />
      </header>

      <ChallengeTop3Section />

      <div className="flex items-center gap-2 px-4 py-3">
        <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-neutral-500">
          서울 전체
        </span>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {THEMES.map((t) => (
            <Tag key={t} as="button" selected={theme === t} onClick={() => setTheme(t)}>
              {t}
            </Tag>
          ))}
        </div>
      </div>

      <div className="flex flex-col px-4 pb-6">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-3">
              <ListRowSkeleton />
            </div>
          ))}

        {isError && <ErrorState onRetry={() => refetch()} />}

        {!isLoading && !isError && entries.length === 0 && <EmptyState title="해당하는 랭킹이 없어요." />}

        {!isLoading &&
          !isError &&
          entries.map((entry) => (
            <Link
              key={entry.spot.id}
              to={`/spots/${entry.spot.id}`}
              className="flex items-center gap-3 border-b border-neutral-50 py-3 last:border-b-0"
            >
              <span
                className={clsx(
                  'flex w-6 shrink-0 items-center justify-center text-center text-sm font-bold',
                  entry.rank === 1
                    ? 'h-6 rounded-full bg-accent text-neutral-900'
                    : 'text-neutral-300',
                )}
              >
                {entry.rank}
              </span>
              <img src={entry.spot.imageUrl} alt={entry.spot.name} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">{entry.spot.name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-neutral-400">
                  <MapPin size={11} />
                  {entry.spot.address}
                </p>
                <div className="mt-1 flex gap-1">
                  {entry.tags.slice(0, 2).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  <Heart size={12} />
                  {formatLikeCount(entry.likeCount)}
                </span>
                <span className="flex items-center gap-1">
                  <Images size={12} />
                  {entry.referenceCount}
                </span>
              </div>
            </Link>
          ))}
      </div>
    </div>
  )
}
