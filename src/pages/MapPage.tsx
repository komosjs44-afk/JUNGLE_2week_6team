import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Route, ChevronRight } from 'lucide-react'
import { useSpots, useGeolocation } from '@/hooks'
import { searchPlaces, type PlaceSearchResult } from '@/features/map/placesSearch'
import { KakaoMap } from '@/components/map/KakaoMap'
import { SpotPreviewCard } from '@/components/map/SpotPreviewCard'
import { Tag } from '@/components/common/Tag'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'

const FILTERS = ['전체', '야경', '노을', '골목', '카페', '자연']
const SEARCH_DEBOUNCE_MS = 400

type LatLng = { latitude: number; longitude: number }

export function MapPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('전체')
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([])
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const [focusLocation, setFocusLocation] = useState<LatLng | null>(null)
  const [pickedLocation, setPickedLocation] = useState<LatLng | null>(null)
  const { data: spots, isError, refetch } = useSpots()
  const { location: currentLocation } = useGeolocation()

  // 지도 핀: 태그 필터만 적용 (검색으로는 핀을 줄이지 않음)
  const filteredSpots = useMemo(() => {
    if (!spots) return []
    if (filter === '전체') return spots
    return spots.filter((s) => s.tags.includes(filter))
  }, [spots, filter])

  // 태그 필터가 바뀌어 선택된 스팟이 결과에서 사라지면 선택도 함께 해제 (마커 없는 카드가 남지 않도록)
  useEffect(() => {
    if (selectedSpotId && !filteredSpots.some((s) => s.id === selectedSpotId)) {
      setSelectedSpotId(null)
    }
  }, [filteredSpots, selectedSpotId])

  // 검색어와 일치하는 "등록된 스팟"
  const matchedSpots = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!spots || !q) return []
    return spots.filter(
      (s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [spots, search])

  // 카카오 장소 검색 (디바운스)
  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setPlaceResults([])
      setSearchStatus('idle')
      return
    }
    setSearchStatus('loading')
    const timer = setTimeout(() => {
      searchPlaces(q)
        .then((results) => {
          setPlaceResults(results)
          setSearchStatus(results.length === 0 ? 'empty' : 'idle')
        })
        .catch(() => {
          setPlaceResults([])
          setSearchStatus('error')
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  function selectSpot(id: string, lat: number, lng: number) {
    setFilter('전체') // 태그 필터에 가려지지 않게
    setSelectedSpotId(id)
    setPickedLocation(null)
    setFocusLocation({ latitude: lat, longitude: lng })
    setShowResults(false)
  }

  function selectPlace(p: PlaceSearchResult) {
    setSelectedSpotId(null)
    setPickedLocation({ latitude: p.latitude, longitude: p.longitude })
    setFocusLocation({ latitude: p.latitude, longitude: p.longitude })
    setSearch(p.placeName)
    setShowResults(false)
  }

  const selectedSpot = spots?.find((s) => s.id === selectedSpotId) ?? null
  const dropdownOpen = showResults && search.trim().length > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative z-30 flex flex-col gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
          <Search size={16} className="text-primary-700" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            placeholder="장소, 스팟, 태그 검색"
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

        {/* 통합 검색 결과 드롭다운 */}
        {dropdownOpen && (
          <div className="absolute inset-x-4 top-full max-h-[60vh] overflow-y-auto rounded-2xl border border-neutral-100 bg-white p-2 shadow-lg shadow-black/10">
            {searchStatus === 'loading' && matchedSpots.length === 0 && (
              <p className="py-4 text-center text-sm text-neutral-400">검색 중…</p>
            )}

            {matchedSpots.length > 0 && (
              <div className="flex flex-col">
                <p className="px-2 py-1.5 text-xs font-semibold text-neutral-400">등록된 스팟</p>
                {matchedSpots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => selectSpot(s.id, s.latitude, s.longitude)}
                    className="flex items-center gap-3 rounded-xl p-2 text-left active:bg-neutral-50"
                  >
                    <img src={s.imageUrl} alt={s.name} className="h-10 w-10 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{s.name}</p>
                      <p className="truncate text-xs text-neutral-400">{s.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {placeResults.length > 0 && (
              <div className="flex flex-col">
                <p className="px-2 py-1.5 text-xs font-semibold text-neutral-400">카카오 장소</p>
                {placeResults.map((p, i) => (
                  <button
                    key={`${p.placeName}-${i}`}
                    type="button"
                    onClick={() => selectPlace(p)}
                    className="flex items-center gap-3 rounded-xl p-2 text-left active:bg-neutral-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                      <MapPin size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{p.placeName}</p>
                      <p className="truncate text-xs text-neutral-400">{p.address}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchStatus !== 'loading' && matchedSpots.length === 0 && placeResults.length === 0 && (
              <p className="py-4 text-center text-sm text-neutral-400">
                {searchStatus === 'error' ? '검색에 실패했어요.' : '검색 결과가 없어요.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 오늘의 추천 촬영 코스 진입 — 기존 /route 상세 페이지를 그대로 재사용 (얇은 카드, 지도 위 공간 최소) */}
      <div className="px-3 pt-3">
        <Link
          to="/route"
          className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 bg-white px-4 py-3 shadow-lg shadow-black/5 active:bg-neutral-50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <Route size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-900">오늘의 추천 촬영 코스</p>
              <p className="truncate text-xs text-neutral-400">가까운 인기 촬영 스팟을 코스로 둘러보세요</p>
            </div>
          </div>
          <ChevronRight size={16} className="shrink-0 text-neutral-400" />
        </Link>
      </div>

      {/* 선택된 Spot이 있을 때만 공간을 차지 — 지도 위를 덮지 않고 검색/필터 바로 아래에 표시 */}
      {selectedSpot && (
        <div className="px-3 pt-3">
          <SpotPreviewCard spot={selectedSpot} />
        </div>
      )}

      <div className="relative flex-1">
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <KakaoMap
            spots={filteredSpots}
            selectedSpotId={selectedSpotId}
            onSelectSpot={setSelectedSpotId}
            onMapClick={() => setSelectedSpotId(null)}
            currentLocation={currentLocation}
            focusLocation={focusLocation}
            pickedLocation={pickedLocation}
          />
        )}

        {!isError && spots && filteredSpots.length === 0 && (
          <div className="absolute inset-x-6 top-6 rounded-lg bg-white shadow-lg shadow-black/5">
            <EmptyState title="해당 태그의 스팟이 없어요." description="다른 태그로 골라보세요." />
          </div>
        )}
      </div>
    </div>
  )
}
