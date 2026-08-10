import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '@/features/map/kakaoMapsLoader'

interface LocationPickerMapProps {
  // 지도 초기 중심 & 마커 위치 (선택 시 갱신)
  location: { lat: number; lng: number } | null
  // 지도 클릭 시 좌표 전달 (읽기전용이면 생략)
  onPick?: (lat: number, lng: number) => void
}

const SEOUL = { lat: 37.5665, lng: 126.978 }

export function LocationPickerMap({ location, onPick }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markerRef = useRef<kakao.maps.Marker | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  // 최초 1회 지도 생성
  useEffect(() => {
    let cancelled = false
    loadKakaoMaps()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return
        const start = location ?? SEOUL
        const center = new window.kakao.maps.LatLng(start.lat, start.lng)
        const map = new window.kakao.maps.Map(containerRef.current, { center, level: 4 })
        mapRef.current = map

        if (location) {
          markerRef.current = new window.kakao.maps.Marker({ position: center, map })
        }

        if (onPick) {
          window.kakao.maps.event.addListener(map, 'click', (...args: unknown[]) => {
            const latlng = (args[0] as kakao.maps.MouseEvent).latLng
            const lat = latlng.getLat()
            const lng = latlng.getLng()
            if (!markerRef.current) {
              markerRef.current = new window.kakao.maps.Marker({ position: latlng, map })
            } else {
              markerRef.current.setMap(map)
              markerRef.current.setPosition(latlng)
            }
            onPick(lat, lng)
          })
        }

        setStatus('ready')
        requestAnimationFrame(() => map.relayout())
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // location 이 바뀌면(검색 선택 등) 지도 이동 + 마커 갱신
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !location) return
    const pos = new window.kakao.maps.LatLng(location.lat, location.lng)
    mapRef.current.setCenter(pos)
    if (!markerRef.current) {
      markerRef.current = new window.kakao.maps.Marker({ position: pos, map: mapRef.current })
    } else {
      markerRef.current.setMap(mapRef.current)
      markerRef.current.setPosition(pos)
    }
  }, [location, status])

  if (status === 'error') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-100 px-4 text-center text-sm text-neutral-400">
        지도를 불러오지 못했어요.
        <br />
        장소 검색을 이용해주세요.
      </div>
    )
  }

  return (
    <div className="absolute inset-0 bg-neutral-100">
      <div ref={containerRef} className="h-full w-full" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )}
    </div>
  )
}
