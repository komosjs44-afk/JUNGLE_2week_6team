import { useEffect, useRef, useState } from 'react'
import type { DeviceLocation, Spot } from '@/types'
import { loadKakaoMaps } from '@/features/map/kakaoMapsLoader'
import { MockMap } from './MockMap'

// RE:FRAME 브랜드 팔레트 — 마커는 Kakao SDK가 DOM으로 직접 그리므로 CSS 토큰 대신 값으로 고정한다.
const BRAND = {
  primary: '#007F6D', // Primary Green — 선택/현재위치 강조
  deep: '#006B5B', // Deep Green — 아이콘/기본 강조
  mint: '#EAF4F1', // Soft Mint — 기본 마커 배경
  border: '#DCE8E4', // Border
} as const

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>'

// Distinct from spot pins (no label, centered dot instead of base-anchored pin) so it always
// reads as "you are here" rather than another photo spot. RE:FRAME 그린으로 통일 — 바깥 반투명
// 링 + 중앙 딥그린 점으로 현재 위치임을 명확히 보이게 한다(파란 기본 마커 사용 안 함).
function createCurrentLocationContent(): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:relative;width:16px;height:16px;'

  const halo = document.createElement('div')
  halo.style.cssText =
    'position:absolute;inset:-10px;border-radius:9999px;background:rgba(0,127,109,0.16);border:1px solid rgba(0,127,109,0.28);'

  const dot = document.createElement('div')
  dot.style.cssText = `position:absolute;inset:0;border-radius:9999px;background:${BRAND.deep};border:2px solid #fff;box-shadow:0 1px 3px rgba(15,42,39,.28);`

  wrapper.appendChild(halo)
  wrapper.appendChild(dot)
  return wrapper
}

// A labelless version of the spot pin — used for a manually tapped/searched point that isn't
// (yet) a registered spot, so it reads as "temporarily picked here" rather than a named spot.
function createPickedLocationContent(): HTMLElement {
  const pin = document.createElement('div')
  pin.style.cssText = `display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;box-shadow:0 2px 6px rgba(0,107,91,.24);background:${BRAND.primary};border:2px solid #fff;color:#fff;`
  pin.innerHTML = PIN_SVG
  return pin
}

// Marker shows only the pin — no name/address label, so the map stays legible once many
// Spots are registered nearby. Selected Spot info surfaces via a preview card instead (see
// MapPage), never as on-map text. RE:FRAME 통일: 기본은 Soft Mint 배경 + Deep Green 아이콘,
// 선택은 Primary Green 배경 + 흰색 아이콘/테두리(강조는 그린 계열 명도만 조절).
function createMarkerContent(isSelected: boolean, onClick: () => void): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scale(${isSelected ? 1.1 : 1});transition:transform .15s;`

  const pin = document.createElement('div')
  const base = `display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;`
  pin.style.cssText = isSelected
    ? `${base}background:${BRAND.primary};color:#fff;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,107,91,.30);`
    : `${base}background:${BRAND.mint};color:${BRAND.deep};border:1px solid ${BRAND.border};box-shadow:0 1px 3px rgba(15,42,39,.10);`
  pin.innerHTML = PIN_SVG

  wrapper.appendChild(pin)
  wrapper.addEventListener('click', onClick)
  return wrapper
}

interface KakaoMapProps {
  spots: Spot[]
  selectedSpotId?: string | null
  onSelectSpot?: (spotId: string) => void
  level?: number
  /** Device GPS location (navigator.geolocation), not a spot's or photo's location. */
  currentLocation?: DeviceLocation | null
  /**
   * Where to point the camera on first load (e.g. a photo's EXIF GPS) — unlike
   * currentLocation, this renders no marker, so it never reads as "you are here".
   */
  initialCenter?: { latitude: number; longitude: number } | null
  /** A manually tapped/searched point that isn't necessarily a registered spot. */
  pickedLocation?: { latitude: number; longitude: number } | null
  /** Recenters the camera whenever this changes (no marker) — e.g. tapping a search result. */
  focusLocation?: { latitude: number; longitude: number } | null
  /** Fires with the tapped coordinates when the map is clicked. */
  onMapClick?: (lat: number, lng: number) => void
}

export function KakaoMap({
  spots,
  selectedSpotId = null,
  onSelectSpot,
  level = 4,
  currentLocation = null,
  initialCenter = null,
  pickedLocation = null,
  focusLocation = null,
  onMapClick,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([])
  const currentLocationOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null)
  const pickedLocationOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null)
  const hasCenteredOnCurrentLocationRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    // spots can still be empty on first render if it comes from an async query (e.g. MapPage);
    // wait for it to become non-empty instead of only checking once at mount.
    if (mapRef.current || spots.length === 0) return

    let cancelled = false

    loadKakaoMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        // initialCenter (e.g. a photo's EXIF GPS) wins outright since it's available
        // synchronously. Otherwise prefer the device's current location if it's already
        // resolved by the time the SDK loads; else fall back to the first spot (unchanged
        // pre-geolocation behavior) — geolocation is async and usually slower than this, so
        // the re-center effect below handles it arriving after the map already exists.
        const center = initialCenter
          ? new window.kakao.maps.LatLng(initialCenter.latitude, initialCenter.longitude)
          : currentLocation
            ? new window.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude)
            : new window.kakao.maps.LatLng(spots[0].latitude, spots[0].longitude)
        mapRef.current = new window.kakao.maps.Map(containerRef.current, { center, level })
        if (initialCenter || currentLocation) hasCenteredOnCurrentLocationRef.current = true
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
    // Markers are synced separately below; this effect only needs to fire again while the
    // map hasn't been created yet (guarded by mapRef.current above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spots])

  // Geolocation usually resolves after the map is already created off of spots[0]; re-center
  // exactly once when it arrives so the map doesn't keep yanking back if the user has panned.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !currentLocation) return
    if (hasCenteredOnCurrentLocationRef.current) return
    mapRef.current.setCenter(new window.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude))
    hasCenteredOnCurrentLocationRef.current = true
  }, [status, currentLocation])

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return

    if (!currentLocation) {
      currentLocationOverlayRef.current?.setMap(null)
      currentLocationOverlayRef.current = null
      return
    }

    const position = new window.kakao.maps.LatLng(currentLocation.latitude, currentLocation.longitude)
    if (currentLocationOverlayRef.current) {
      currentLocationOverlayRef.current.setPosition(position)
      return
    }

    currentLocationOverlayRef.current = new window.kakao.maps.CustomOverlay({
      position,
      content: createCurrentLocationContent(),
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 3,
    })
    currentLocationOverlayRef.current.setMap(mapRef.current)
  }, [status, currentLocation])

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !onMapClick) return
    const map = mapRef.current
    const handler = (e: unknown) => {
      const { latLng } = e as kakao.maps.MapMouseEvent
      onMapClick(latLng.getLat(), latLng.getLng())
    }
    window.kakao.maps.event.addListener(map, 'click', handler)
    return () => window.kakao.maps.event.removeListener(map, 'click', handler)
  }, [status, onMapClick])

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return

    if (!pickedLocation) {
      pickedLocationOverlayRef.current?.setMap(null)
      pickedLocationOverlayRef.current = null
      return
    }

    const position = new window.kakao.maps.LatLng(pickedLocation.latitude, pickedLocation.longitude)
    if (pickedLocationOverlayRef.current) {
      pickedLocationOverlayRef.current.setPosition(position)
      return
    }

    pickedLocationOverlayRef.current = new window.kakao.maps.CustomOverlay({
      position,
      content: createPickedLocationContent(),
      yAnchor: 1,
      zIndex: 4,
    })
    pickedLocationOverlayRef.current.setMap(mapRef.current)
  }, [status, pickedLocation])

  // 검색 결과 선택 등으로 카메라만 이동 (마커 없음)
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !focusLocation) return
    mapRef.current.setCenter(new window.kakao.maps.LatLng(focusLocation.latitude, focusLocation.longitude))
  }, [status, focusLocation])

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return

    overlaysRef.current.forEach((overlay) => overlay.setMap(null))
    overlaysRef.current = []

    spots.forEach((spot) => {
      const position = new window.kakao.maps.LatLng(spot.latitude, spot.longitude)
      const content = createMarkerContent(spot.id === selectedSpotId, () => onSelectSpot?.(spot.id))
      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 1,
        zIndex: spot.id === selectedSpotId ? 2 : 1,
      })
      overlay.setMap(mapRef.current!)
      overlaysRef.current.push(overlay)
    })
  }, [status, spots, selectedSpotId, onSelectSpot])

  // Kakao renders into a fixed-size canvas at init time; if this map was mounted while
  // hidden (e.g. inside a tab that wasn't visible yet), it needs an explicit relayout once
  // it becomes visible or the tiles stay clipped to a 0-size box.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return
    const raf = requestAnimationFrame(() => mapRef.current?.relayout())
    return () => cancelAnimationFrame(raf)
  }, [status])

  if (status === 'error') {
    return (
      <MockMap
        spots={spots}
        selectedSpotId={selectedSpotId}
        onSelectSpot={(id) => onSelectSpot?.(id)}
      />
    )
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-100">
      <div ref={containerRef} className="h-full w-full" />
      {/* Kakao 기본 타일의 노랑/주황 채도를 아주 약하게 눌러 RE:FRAME 톤과 어울리게 한다.
          가독성을 해치지 않도록 극히 낮은 불투명도 + pointer-events:none(지도 조작 방해 없음). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'rgba(0,127,109,0.06)', mixBlendMode: 'multiply' }}
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}
    </div>
  )
}
