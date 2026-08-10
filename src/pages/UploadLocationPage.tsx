import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPinned, CheckCircle2 } from 'lucide-react'
import { useUploadWizardStore } from '@/stores'
import { useSpots } from '@/hooks'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { MockMap } from '@/components/map/MockMap'

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function UploadLocationPage() {
  const navigate = useNavigate()
  const { file, exif, spotId, setSpotId } = useUploadWizardStore()
  const { data: spots } = useSpots()
  const [pickerMode, setPickerMode] = useState<'none' | 'search' | 'map'>('none')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!file) navigate('/upload', { replace: true })
  }, [file, navigate])

  const nearestSpot = useMemo(() => {
    if (!spots || !exif?.latitude || !exif.longitude) return null
    let best = spots[0]
    let bestDist = Infinity
    for (const spot of spots) {
      const dist = haversineMeters(
        { lat: exif.latitude, lng: exif.longitude },
        { lat: spot.latitude, lng: spot.longitude },
      )
      if (dist < bestDist) {
        bestDist = dist
        best = spot
      }
    }
    return best
  }, [spots, exif])

  useEffect(() => {
    if (nearestSpot && !spotId) setSpotId(nearestSpot.id)
    // Only auto-apply the GPS match once, the first time it's computed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearestSpot])

  const filteredSpots = useMemo(() => {
    if (!spots) return []
    if (!query) return spots
    const q = query.toLowerCase()
    return spots.filter((s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.includes(query)))
  }, [spots, query])

  const selectedSpot = spots?.find((s) => s.id === spotId)
  const gpsFound = !!exif?.latitude

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="위치 확인" />
      <ProgressBar step={3} total={5} />

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {gpsFound && nearestSpot && pickerMode === 'none' && (
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary-700">
              <CheckCircle2 size={16} />
              GPS에서 위치를 찾았어요.
            </p>
            <p className="text-sm text-neutral-700">{nearestSpot.name} 근처에서 촬영된 것 같아요.</p>
          </div>
        )}

        {!gpsFound && pickerMode === 'none' && (
          <div className="rounded-2xl bg-neutral-50 p-4 text-center">
            <p className="text-sm font-medium text-neutral-700">사진에서 위치 정보를 찾지 못했어요.</p>
            <p className="mt-1 text-xs text-neutral-400">아래에서 촬영 장소를 알려주세요.</p>
          </div>
        )}

        {pickerMode === 'none' && selectedSpot && (
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 p-3">
            <img src={selectedSpot.imageUrl} alt={selectedSpot.name} className="h-14 w-14 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">{selectedSpot.name}</p>
              <p className="text-xs text-neutral-400">{selectedSpot.address}</p>
            </div>
          </div>
        )}

        {pickerMode === 'search' && (
          <div className="flex flex-col gap-3">
            <div className="flex h-11 items-center gap-2 rounded-xl bg-neutral-100 px-3">
              <Search size={16} className="text-neutral-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="장소 이름으로 검색"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
            <div className="flex flex-col gap-2">
              {filteredSpots.map((spot) => (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => {
                    setSpotId(spot.id)
                    setPickerMode('none')
                  }}
                  className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2 text-left"
                >
                  <img src={spot.imageUrl} alt={spot.name} className="h-12 w-12 rounded-lg object-cover" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{spot.name}</p>
                    <p className="text-xs text-neutral-400">{spot.address}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {pickerMode === 'map' && spots && (
          <div className="h-72 overflow-hidden rounded-2xl">
            <MockMap
              spots={spots}
              selectedSpotId={spotId}
              onSelectSpot={(id) => {
                setSpotId(id)
                setPickerMode('none')
              }}
            />
          </div>
        )}

        {pickerMode === 'none' && (
          <div className="mt-auto flex flex-col gap-2">
            <Button variant="secondary" fullWidth icon={<Search size={16} />} onClick={() => setPickerMode('search')}>
              장소 검색
            </Button>
            <Button
              variant="secondary"
              fullWidth
              icon={<MapPinned size={16} />}
              onClick={() => setPickerMode('map')}
            >
              지도에서 직접 선택
            </Button>
          </div>
        )}
      </div>

      <StickyActionBar>
        <Button fullWidth disabled={!spotId} onClick={() => navigate('/upload/info')}>
          이 위치 사용
        </Button>
      </StickyActionBar>
    </div>
  )
}
