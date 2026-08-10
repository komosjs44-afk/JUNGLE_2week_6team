import { Navigation, Sparkles, MapPinned } from 'lucide-react'
import type { Reference } from '@/types'
import { buildShootingGuide } from '@/utils/shootingGuide'
import { formatDistance } from '@/utils/format'
import { Button } from '@/components/common/Button'

export function GuideTab({ reference }: { reference: Reference }) {
  const guide = buildShootingGuide(reference)
  const directionsHref = `https://map.kakao.com/link/map/${encodeURIComponent(reference.spot.name)},${reference.spot.latitude},${reference.spot.longitude}`

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs text-neutral-400">촬영 위치까지</p>
          <p className="mt-1 text-lg font-bold text-neutral-900">{formatDistance(guide.distanceMeters)}</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs text-neutral-400">촬영 방향</p>
          <p className="mt-1 text-lg font-bold text-neutral-900">{guide.directionLabel}</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs text-neutral-400">추천 시간</p>
          <p className="mt-1 text-base font-semibold text-neutral-900">{guide.recommendedTimeRange}</p>
        </div>
        <div className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs text-neutral-400">추천 화각</p>
          <p className="mt-1 text-base font-semibold text-neutral-900">{guide.recommendedFocalLength}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary-600">
          <Sparkles size={13} />
          구도 Tip
        </p>
        <p className="text-sm leading-relaxed text-neutral-700">{guide.compositionTip}</p>
      </div>

      <div className="rounded-2xl bg-neutral-900 p-4 text-white">
        <p className="mb-3 text-xs text-neutral-400">원본 Camera Setting</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[11px] text-neutral-400">화각</p>
            <p className="mt-1 text-sm font-semibold">{guide.cameraSetting.focalLength}mm</p>
          </div>
          <div>
            <p className="text-[11px] text-neutral-400">조리개</p>
            <p className="mt-1 text-sm font-semibold">F{guide.cameraSetting.aperture}</p>
          </div>
          <div>
            <p className="text-[11px] text-neutral-400">ISO</p>
            <p className="mt-1 text-sm font-semibold">{guide.cameraSetting.iso}</p>
          </div>
          <div>
            <p className="text-[11px] text-neutral-400">셔터</p>
            <p className="mt-1 text-sm font-semibold">{guide.cameraSetting.shutterSpeed}</p>
          </div>
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
        <Button variant="secondary" fullWidth disabled>
          AR로 보기 (Coming Soon)
        </Button>
      </div>
    </div>
  )
}
