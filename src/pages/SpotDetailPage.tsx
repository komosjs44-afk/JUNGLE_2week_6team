import { useParams } from 'react-router-dom'
import { Heart, Images, MapPin, Navigation } from 'lucide-react'
import { clsx } from 'clsx'
import { useSpot, useReferencesBySpot } from '@/hooks'
import { useSaveStore } from '@/stores'
import { PageHeader } from '@/components/layout/PageHeader'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { IconButton } from '@/components/common/IconButton'
import { Tag } from '@/components/common/Tag'
import { Skeleton, CardGridSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { ReferenceCard } from '@/components/reference/ReferenceCard'

export function SpotDetailPage() {
  const { spotId } = useParams<{ spotId: string }>()
  const { data: spot, isLoading, isError, refetch } = useSpot(spotId)
  const { data: references, isLoading: refsLoading } = useReferencesBySpot(spotId)
  const isSaved = useSaveStore((s) => (spotId ? s.isSpotSaved(spotId) : false))
  const toggleSave = useSaveStore((s) => s.toggleSpotSave)

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    )
  }

  if (isError || !spot) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Spot" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const directionsHref = `https://map.kakao.com/link/map/${encodeURIComponent(spot.name)},${spot.latitude},${spot.longitude}`

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative aspect-[4/3] w-full shrink-0">
        <img src={spot.imageUrl} alt={spot.name} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0">
          <PageHeader
            transparent
            right={
              <IconButton variant="filled" aria-label={isSaved ? '저장 취소' : '저장'} onClick={() => toggleSave(spot.id)}>
                <Heart size={18} className={clsx(isSaved && 'fill-primary-600 text-primary-600')} />
              </IconButton>
            }
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{spot.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-400">
            <MapPin size={14} />
            {spot.address}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {spot.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-neutral-50 p-4">
          <div>
            <p className="text-xs text-neutral-400">추천 촬영 시간</p>
            <p className="mt-1 text-sm font-medium text-neutral-900">{spot.recommendedTime ?? '정보 없음'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400">등록된 Reference</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-neutral-900">
              <Images size={14} />
              {spot.referenceCount}개
            </p>
          </div>
        </div>

        {spot.description && <p className="text-sm leading-relaxed text-neutral-600">{spot.description}</p>}

        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">이 장소의 Reference</h2>
          {refsLoading && <CardGridSkeleton count={4} />}
          {!refsLoading && (!references || references.length === 0) && <EmptyState />}
          {!refsLoading && references && references.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {references.map((reference) => (
                <ReferenceCard key={reference.id} reference={reference} />
              ))}
            </div>
          )}
        </div>
      </div>

      <StickyActionBar>
        <Button variant="secondary" fullWidth onClick={() => toggleSave(spot.id)}>
          <Heart size={16} className={clsx(isSaved && 'fill-primary-600 text-primary-600')} />
          {isSaved ? '저장됨' : 'Spot 저장'}
        </Button>
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 active:scale-[0.98]"
        >
          <Navigation size={16} />
          길찾기
        </a>
      </StickyActionBar>
    </div>
  )
}
