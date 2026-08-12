import { useNavigate } from 'react-router-dom'
import { Navigation, Lightbulb, MapPinned, Scan } from 'lucide-react'
import type { Reference } from '@/types'
import { buildShootingGuide } from '@/utils/shootingGuide'
import { formatDistance } from '@/utils/format'
import { Button } from '@/components/common/Button'
import { InfoRow } from '@/components/common/InfoRow'
import { KakaoMap } from '@/components/map/KakaoMap'

export function GuideTab({ reference }: { reference: Reference }) {
  const navigate = useNavigate()
  const guide = buildShootingGuide(reference)
  const directionsHref = `https://map.kakao.com/link/map/${encodeURIComponent(reference.spot.name)},${reference.spot.latitude},${reference.spot.longitude}`

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="divide-y divide-neutral-100">
        <InfoRow label="촬영 위치까지" value={formatDistance(guide.distanceMeters)} />
        <InfoRow label="촬영 방향" value={guide.directionLabel} />
        <InfoRow label="추천 시간" value={guide.recommendedTimeRange} />
        <InfoRow label="추천 화각" value={guide.recommendedFocalLength} />
      </div>

      <div className="relative h-44 w-full overflow-hidden rounded-lg">
        <KakaoMap
          spots={[reference.spot]}
          selectedSpotId={reference.spot.id}
          onSelectSpot={(spotId) => navigate(`/spots/${spotId}`)}
          level={4}
        />
      </div>

      <div className="rounded-md border border-primary-100 bg-primary-50 p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary-600">
          <Lightbulb size={13} />
          구도 Tip
        </p>
        <p className="text-sm leading-relaxed text-neutral-700">{guide.compositionTip}</p>
      </div>

      <div>
        <p className="mb-1 text-xs text-neutral-400">원본 Camera Setting</p>
        <div className="divide-y divide-neutral-100">
          <InfoRow label="화각" value={`${guide.cameraSetting.focalLength}mm`} />
          <InfoRow label="조리개" value={`F${guide.cameraSetting.aperture}`} />
          <InfoRow label="ISO" value={guide.cameraSetting.iso} />
          <InfoRow label="셔터" value={guide.cameraSetting.shutterSpeed} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={directionsHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-700 active:scale-[0.98]"
        >
          <Navigation size={16} />
          길찾기
        </a>
        <Button variant="secondary" fullWidth icon={<MapPinned size={16} />}>
          촬영 위치로 이동
        </Button>
        <Button
          fullWidth
          icon={<Scan size={16} />}
          onClick={() =>
            navigate('/scene-match', {
              state: { targetUrl: reference.imageUrl, targetName: reference.title },
            })
          }
        >
          AR로 보기
        </Button>
      </div>
    </div>
  )
}
