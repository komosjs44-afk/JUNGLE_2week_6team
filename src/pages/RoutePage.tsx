import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, MapPin } from 'lucide-react'
import { useRecommendedRoute } from '@/hooks'
import { formatDistance, formatDuration } from '@/utils/format'
import { Button } from '@/components/common/Button'
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { KakaoMap } from '@/components/map/KakaoMap'

export function RoutePage() {
  const { data: route, isLoading, isError, refetch } = useRecommendedRoute()
  const [saved, setSaved] = useState(false)

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="text-xl font-bold text-neutral-900">오늘의 추천 코스</h1>
      </header>

      {isLoading && (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {route && (
        <div className="flex flex-1 flex-col gap-5 px-4 py-4">
          <p className="text-sm text-neutral-500">{route.description}</p>

          {/* 코스를 지도에 표시 — 방문 순서대로 마커에 번호를 달고 선으로 잇는다 */}
          <div className="relative h-60 overflow-hidden rounded-[12px] border border-neutral-100">
            <KakaoMap
              spots={route.spots.map((rs) => rs.spot)}
              path={route.spots.map((rs) => ({
                latitude: rs.spot.latitude,
                longitude: rs.spot.longitude,
              }))}
              spotOrder={Object.fromEntries(route.spots.map((rs) => [rs.spot.id, rs.order]))}
            />
          </div>

          <div className="flex flex-col">
            {route.spots.map((rs, index) => (
              <div key={rs.spot.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                    {rs.order}
                  </span>
                  {index < route.spots.length - 1 && <span className="my-1 w-px flex-1 bg-neutral-200" />}
                </div>
                <div className="flex-1 pb-6">
                  <Link to={`/spots/${rs.spot.id}`} className="flex items-center gap-3 rounded-md border border-neutral-100 p-3">
                    <img src={rs.spot.imageUrl} alt={rs.spot.name} className="h-14 w-14 rounded-md object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">{rs.spot.name}</p>
                      <p className="flex items-center gap-1 text-xs text-neutral-400">
                        <MapPin size={11} />
                        {rs.arrivalTime} 도착
                      </p>
                    </div>
                  </Link>
                  {rs.walkMinutesToNext && (
                    <p className="mt-2 pl-1 text-xs text-neutral-400">↓ 도보 {rs.walkMinutesToNext}분</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="border-t border-neutral-100 pt-4 text-center text-sm font-medium text-neutral-700">
            총 {formatDistance(route.totalDistanceKm * 1000)} · {formatDuration(route.totalDurationMinutes)}
          </p>

          <Button
            fullWidth
            variant={saved ? 'secondary' : 'primary'}
            icon={saved ? <CheckCircle2 size={16} /> : undefined}
            onClick={() => setSaved(true)}
          >
            {saved ? '코스가 저장되었어요' : '코스 저장'}
          </Button>
        </div>
      )}
    </div>
  )
}
