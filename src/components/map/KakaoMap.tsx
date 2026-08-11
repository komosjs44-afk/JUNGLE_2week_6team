import { useEffect, useRef, useState } from 'react'
import type { DeviceLocation, Spot } from '@/types'
import { loadKakaoMaps } from '@/features/map/kakaoMapsLoader'
import { MockMap } from './MockMap'

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>'

// Distinct from spot pins (no label, centered dot instead of base-anchored pin) so it always
// reads as "you are here" rather than another photo spot.
function createCurrentLocationContent(): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:relative;width:18px;height:18px;'

  const halo = document.createElement('div')
  halo.style.cssText =
    'position:absolute;inset:-9px;border-radius:9999px;background:rgba(59,130,246,0.25);'

  const dot = document.createElement('div')
  dot.style.cssText =
    'position:absolute;inset:0;border-radius:9999px;background:#3b82f6;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);'

  wrapper.appendChild(halo)
  wrapper.appendChild(dot)
  return wrapper
}

// A labelless version of the spot pin — used for a manually tapped/searched point that isn't
// (yet) a registered spot, so it reads as "temporarily picked here" rather than a named spot.
function createPickedLocationContent(): HTMLElement {
  const pin = document.createElement('div')
  pin.style.cssText =
    'display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,.18);background:var(--color-primary-600);color:#fff;'
  pin.innerHTML = PIN_SVG
  return pin
}

function createMarkerContent(spot: Spot, isSelected: boolean, onClick: () => void): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = `display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:scale(${isSelected ? 1.1 : 1});transition:transform .15s;`

  const pin = document.createElement('div')
  pin.style.cssText = `display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;box-shadow:0 2px 6px rgba(0,0,0,.18);background:${isSelected ? 'var(--color-primary-600)' : '#fff'};color:${isSelected ? '#fff' : 'var(--color-primary-600)'};`
  pin.innerHTML = PIN_SVG

  const label = document.createElement('span')
  label.textContent = spot.name
  label.style.cssText = `margin-top:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:500;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.12);background:${isSelected ? 'var(--color-primary-600)' : '#fff'};color:${isSelected ? '#fff' : 'var(--color-neutral-700, #37444a)'};`

  wrapper.appendChild(pin)
  wrapper.appendChild(label)
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
      const content = createMarkerContent(spot, spot.id === selectedSpotId, () => onSelectSpot?.(spot.id))
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
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}
    </div>
  )
}
