import { useEffect, useRef, useState } from 'react'
import type { Spot } from '@/types'
import { loadKakaoMaps } from '@/features/map/kakaoMapsLoader'
import { MockMap } from './MockMap'

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>'

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
}

export function KakaoMap({ spots, selectedSpotId = null, onSelectSpot, level = 4 }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    // spots can still be empty on first render if it comes from an async query (e.g. MapPage);
    // wait for it to become non-empty instead of only checking once at mount.
    if (mapRef.current || spots.length === 0) return

    let cancelled = false

    loadKakaoMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const first = spots[0]
        const center = new window.kakao.maps.LatLng(first.latitude, first.longitude)
        mapRef.current = new window.kakao.maps.Map(containerRef.current, { center, level })
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
