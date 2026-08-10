import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPinned, MapPin, CheckCircle2 } from 'lucide-react'
import { useUploadWizardStore } from '@/stores'
import { useSpots, useGeolocation } from '@/hooks'
import { findNearestSpot } from '@/utils/spotMatching'
import { reverseGeocode } from '@/features/map/reverseGeocode'
import { searchPlaces, type PlaceSearchResult } from '@/features/map/placesSearch'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { KakaoMap } from '@/components/map/KakaoMap'

const SEARCH_DEBOUNCE_MS = 400

export function UploadLocationPage() {
  const navigate = useNavigate()
  const { file, exif, spotId, photoLocation, setSpotId, setPhotoLocation } = useUploadWizardStore()
  const { data: spots } = useSpots()
  const { location: deviceLocation } = useGeolocation()
  const [pickerMode, setPickerMode] = useState<'none' | 'search' | 'map'>('none')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')

  useEffect(() => {
    if (!file) navigate('/upload', { replace: true })
  }, [file, navigate])

  const gpsFound = !!exif?.latitude && !!exif.longitude

  // EXIF GPS always becomes a usable PhotoLocation — an existing Spot nearby is never required.
  useEffect(() => {
    if (!gpsFound || photoLocation) return
    let cancelled = false
    reverseGeocode(exif!.latitude!, exif!.longitude!).then((address) => {
      if (cancelled) return
      setPhotoLocation({
        latitude: exif!.latitude!,
        longitude: exif!.longitude!,
        address: address ?? undefined,
        source: 'exif',
      })
    })
    return () => {
      cancelled = true
    }
    // Only needs to run once for this photo's coordinates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsFound])

  // Advisory only, never auto-applied: if the resolved location happens to be near an already
  // registered Spot, offer it as a shortcut so users don't accidentally create a duplicate —
  // but picking a brand-new location that matches nothing is always valid on its own.
  const candidateSpot = useMemo(() => {
    if (!spots || !photoLocation || spotId) return null
    const matched = findNearestSpot({ lat: photoLocation.latitude, lng: photoLocation.longitude }, spots)
    return matched ? (spots.find((s) => s.id === matched.spotId) ?? null) : null
  }, [spots, photoLocation, spotId])

  // Real Kakao Places keyword search, debounced.
  useEffect(() => {
    if (pickerMode !== 'search') return
    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      setSearchStatus('idle')
      return
    }
    setSearchStatus('loading')
    const timer = setTimeout(() => {
      searchPlaces(trimmed)
        .then((results) => {
          setSearchResults(results)
          setSearchStatus(results.length === 0 ? 'empty' : 'idle')
        })
        .catch(() => {
          setSearchResults([])
          setSearchStatus('error')
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, pickerMode])

  // A manual pick (search result or map tap) always creates/uses a fresh location — it's
  // never blocked by, or forced onto, an existing Spot.
  function pickLocation(
    latitude: number,
    longitude: number,
    source: PlaceSearchResult['source'] | 'map',
    placeName?: string,
    address?: string,
  ) {
    setSpotId(null)
    setPhotoLocation({ latitude, longitude, placeName, address, source })
    setPickerMode('none')
  }

  const selectedSpot = spots?.find((s) => s.id === spotId)
  const canSubmit = !!spotId || !!photoLocation

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="위치 확인" />
      <ProgressBar step={3} total={5} />

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {gpsFound && !photoLocation && pickerMode === 'none' && (
          <div className="rounded-md bg-neutral-50 p-4 text-center">
            <p className="text-sm font-medium text-neutral-700">사진의 위치 정보를 확인하고 있어요...</p>
          </div>
        )}

        {photoLocation?.source === 'exif' && !spotId && pickerMode === 'none' && (
          <div className="rounded-md border border-primary-100 bg-primary-50 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-primary-700">
              <CheckCircle2 size={16} />
              GPS에서 위치를 찾았어요.
            </p>
            <p className="text-sm text-neutral-700">
              {photoLocation.address
                ? `${photoLocation.address}에서 촬영된 사진이에요.`
                : '주소를 확인하지 못했지만 이 위치를 사용할 수 있어요.'}
            </p>
          </div>
        )}

        {!gpsFound && !photoLocation && pickerMode === 'none' && (
          <div className="rounded-md bg-neutral-50 p-4 text-center">
            <p className="text-sm font-medium text-neutral-700">사진에서 위치 정보를 찾지 못했어요.</p>
            <p className="mt-1 text-xs text-neutral-400">아래에서 촬영 장소를 알려주세요.</p>
          </div>
        )}

        {candidateSpot && pickerMode === 'none' && (
          <button
            type="button"
            onClick={() => {
              setSpotId(candidateSpot.id)
              setPhotoLocation(null)
            }}
            className="flex items-center gap-3 rounded-md border border-neutral-100 p-3 text-left"
          >
            <img src={candidateSpot.imageUrl} alt={candidateSpot.name} className="h-12 w-12 rounded-md object-cover" />
            <div>
              <p className="text-xs text-neutral-400">근처에 이미 등록된 스팟이 있어요</p>
              <p className="text-sm font-semibold text-neutral-900">{candidateSpot.name} 사용하기</p>
            </div>
          </button>
        )}

        {pickerMode === 'none' && selectedSpot && (
          <div className="flex items-center gap-3 rounded-md border border-neutral-100 p-3">
            <img src={selectedSpot.imageUrl} alt={selectedSpot.name} className="h-14 w-14 rounded-md object-cover" />
            <div>
              <p className="text-sm font-semibold text-neutral-900">{selectedSpot.name}</p>
              <p className="text-xs text-neutral-400">{selectedSpot.address}</p>
            </div>
          </div>
        )}

        {pickerMode === 'none' && !spotId && photoLocation && (
          <div className="flex items-center gap-3 rounded-md border border-neutral-100 p-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
              <MapPin size={22} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-neutral-900">
                {photoLocation.placeName ?? '새로운 촬영 스팟'}
              </p>
              <p className="truncate text-xs text-neutral-400">
                {photoLocation.address ??
                  `${photoLocation.latitude.toFixed(5)}, ${photoLocation.longitude.toFixed(5)}`}
              </p>
              <p className="mt-0.5 text-xs text-primary-600">새로운 스팟으로 등록돼요</p>
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

            {searchStatus === 'loading' && <p className="py-6 text-center text-sm text-neutral-400">검색 중...</p>}
            {searchStatus === 'empty' && <p className="py-6 text-center text-sm text-neutral-400">검색 결과가 없습니다.</p>}
            {searchStatus === 'error' && (
              <p className="py-6 text-center text-sm text-danger">검색에 실패했어요. 다시 시도해주세요.</p>
            )}

            <div className="flex flex-col gap-2">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.placeName}-${index}`}
                  type="button"
                  onClick={() => pickLocation(result.latitude, result.longitude, 'search', result.placeName, result.address)}
                  className="flex flex-col gap-0.5 rounded-md border border-neutral-100 p-3 text-left"
                >
                  <p className="text-sm font-medium text-neutral-900">{result.placeName}</p>
                  <p className="text-xs text-neutral-400">{result.address}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {pickerMode === 'map' && spots && (
          <div className="relative h-72 overflow-hidden rounded-lg">
            <KakaoMap
              spots={spots}
              selectedSpotId={spotId}
              onSelectSpot={(id) => {
                setSpotId(id)
                setPhotoLocation(null)
                setPickerMode('none')
              }}
              initialCenter={photoLocation ? { latitude: photoLocation.latitude, longitude: photoLocation.longitude } : undefined}
              currentLocation={deviceLocation}
              pickedLocation={!spotId && photoLocation ? photoLocation : null}
              onMapClick={async (lat, lng) => {
                const address = await reverseGeocode(lat, lng)
                pickLocation(lat, lng, 'map', undefined, address ?? undefined)
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
        <Button fullWidth disabled={!canSubmit} onClick={() => navigate('/upload/info')}>
          이 위치 사용
        </Button>
      </StickyActionBar>
    </div>
  )
}
