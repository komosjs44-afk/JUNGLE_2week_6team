import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPinned, CheckCircle2, MapPin } from 'lucide-react'
import { useUploadWizardStore } from '@/stores'
import { useSpots } from '@/hooks'
import { searchPlaces, coordToAddress, type PlaceResult } from '@/features/map/kakaoPlaces'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { LocationPickerMap } from '@/components/map/LocationPickerMap'

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
  const { file, exif, spotId, newSpotName, manualLocation, setSpotId, setNewSpotName, setManualLocation } =
    useUploadWizardStore()
  const { data: spots } = useSpots()
  const [pickerMode, setPickerMode] = useState<'none' | 'search' | 'map'>('none')
  const [query, setQuery] = useState('')
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) navigate('/upload', { replace: true })
  }, [file, navigate])

  // 선택 상태를 한 곳에서 정리
  function selectExistingSpot(id: string) {
    setSpotId(id)
    setNewSpotName('')
    setManualLocation(null)
    setPickerMode('none')
  }

  function selectNewPlace(name: string, lat: number, lng: number, address: string) {
    setSpotId(null)
    setNewSpotName(name)
    setManualLocation({ lat, lng, address })
    setPickerMode('none')
  }

  // GPS(EXIF)로 가장 가까운 등록 스팟을 한 번 자동 추천
  const nearestSpot = useMemo(() => {
    if (!spots || spots.length === 0 || !exif?.latitude || !exif.longitude) return null
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
    if (nearestSpot && !spotId && !manualLocation) setSpotId(nearestSpot.id)
    // GPS 매칭은 최초 1회만 자동 적용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearestSpot])

  // 등록된 스팟 중 검색어와 일치하는 것
  const matchedSpots = useMemo(() => {
    if (!spots || !query.trim()) return []
    const q = query.toLowerCase()
    return spots.filter((s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.includes(query)))
  }, [spots, query])

  // 카카오 장소 검색 (디바운스)
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setPlaceResults([])
      setSearchError(null)
      return
    }
    setSearching(true)
    const t = setTimeout(() => {
      searchPlaces(q)
        .then((r) => {
          setPlaceResults(r)
          setSearchError(null)
        })
        .catch(() => setSearchError('장소 검색을 사용할 수 없어요. (지도 키 확인 필요)'))
        .finally(() => setSearching(false))
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  // 지도 클릭 → 좌표 선택 → 주소 변환
  async function handleMapPick(lat: number, lng: number) {
    const address = await coordToAddress(lat, lng)
    setSpotId(null)
    setNewSpotName(address || '선택한 위치')
    setManualLocation({ lat, lng, address })
  }

  const selectedSpot = spots?.find((s) => s.id === spotId)
  const selectedLocation = selectedSpot
    ? { lat: selectedSpot.latitude, lng: selectedSpot.longitude }
    : manualLocation
      ? { lat: manualLocation.lat, lng: manualLocation.lng }
      : null
  const selectedName = selectedSpot?.name ?? (manualLocation ? newSpotName : null)
  const selectedAddress = selectedSpot?.address ?? manualLocation?.address ?? ''
  const hasSelection = !!spotId || !!manualLocation
  const gpsFound = !!exif?.latitude

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="위치 확인" />
      <ProgressBar step={3} total={5} />

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {/* 기본 화면: 선택 안내 + 현재 선택 미리보기 */}
        {pickerMode === 'none' && (
          <>
            {gpsFound && nearestSpot && (
              <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary-700">
                  <CheckCircle2 size={16} />
                  GPS에서 위치를 찾았어요.
                </p>
                <p className="text-sm text-neutral-700">{nearestSpot.name} 근처에서 촬영된 것 같아요.</p>
              </div>
            )}
            {!gpsFound && !hasSelection && (
              <div className="rounded-2xl bg-neutral-50 p-4 text-center">
                <p className="text-sm font-medium text-neutral-700">사진에서 위치 정보를 찾지 못했어요.</p>
                <p className="mt-1 text-xs text-neutral-400">장소를 검색하거나 지도에서 선택해주세요.</p>
              </div>
            )}

            {/* 선택한 위치 미리보기 (지도) */}
            {hasSelection && selectedLocation && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-100 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">{selectedName}</p>
                    {selectedAddress && <p className="truncate text-xs text-neutral-400">{selectedAddress}</p>}
                    {!selectedSpot && (
                      <p className="text-[11px] text-primary-600">새 장소로 등록돼요</p>
                    )}
                  </div>
                </div>
                <div className="relative h-56 overflow-hidden rounded-2xl">
                  <LocationPickerMap location={selectedLocation} />
                </div>
              </div>
            )}

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
          </>
        )}

        {/* 검색 모드 */}
        {pickerMode === 'search' && (
          <div className="flex flex-col gap-3">
            <div className="flex h-11 items-center gap-2 rounded-xl bg-neutral-100 px-3">
              <Search size={16} className="text-neutral-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="장소 이름으로 검색 (예: 남산타워, 성수동 카페)"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>

            {searchError && <p className="text-xs text-danger">{searchError}</p>}
            {searching && <p className="text-xs text-neutral-400">검색 중…</p>}

            {/* 등록된 스팟 */}
            {matchedSpots.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-neutral-400">등록된 장소</p>
                {matchedSpots.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    onClick={() => selectExistingSpot(spot.id)}
                    className="flex items-center gap-3 rounded-xl border border-neutral-100 p-2 text-left"
                  >
                    <img src={spot.imageUrl} alt={spot.name} className="h-12 w-12 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{spot.name}</p>
                      <p className="truncate text-xs text-neutral-400">{spot.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 카카오 검색 결과 */}
            {placeResults.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-neutral-400">검색 결과</p>
                {placeResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectNewPlace(p.name, p.lat, p.lng, p.address)}
                    className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                      <MapPin size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                      <p className="truncate text-xs text-neutral-400">{p.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching && query.trim() && matchedSpots.length === 0 && placeResults.length === 0 && !searchError && (
              <p className="py-6 text-center text-sm text-neutral-400">검색 결과가 없어요.</p>
            )}

            <Button variant="ghost" fullWidth onClick={() => setPickerMode('none')}>
              닫기
            </Button>
          </div>
        )}

        {/* 지도 직접 선택 모드 */}
        {pickerMode === 'map' && (
          <div className="flex flex-1 flex-col gap-3">
            <p className="text-sm text-neutral-500">지도를 눌러 촬영 장소를 선택하세요.</p>
            <div className="relative min-h-[20rem] flex-1 overflow-hidden rounded-2xl">
              <LocationPickerMap location={selectedLocation ?? null} onPick={handleMapPick} />
            </div>
            {manualLocation && (
              <div className="rounded-xl border border-neutral-100 p-3">
                <p className="text-sm font-medium text-neutral-900">{newSpotName}</p>
                {manualLocation.address && (
                  <p className="text-xs text-neutral-400">{manualLocation.address}</p>
                )}
              </div>
            )}
            <Button fullWidth onClick={() => setPickerMode('none')}>
              {manualLocation ? '이 위치로 선택' : '닫기'}
            </Button>
          </div>
        )}
      </div>

      {pickerMode === 'none' && (
        <StickyActionBar>
          <Button fullWidth disabled={!hasSelection} onClick={() => navigate('/upload/info')}>
            이 위치 사용
          </Button>
        </StickyActionBar>
      )}
    </div>
  )
}
