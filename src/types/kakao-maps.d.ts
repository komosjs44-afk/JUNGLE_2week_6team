// Minimal ambient types for the Kakao Maps JavaScript SDK (loaded at runtime via <script>,
// not an npm package). Only covers the APIs actually used in this project.
declare namespace kakao.maps {
  class LatLng {
    constructor(latitude: number, longitude: number)
    getLat(): number
    getLng(): number
  }

  interface MapOptions {
    center: LatLng
    level?: number
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions)
    setCenter(latlng: LatLng): void
    getCenter(): LatLng
    setLevel(level: number): void
    relayout(): void
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map
    title?: string
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    setPosition(position: LatLng): void
    getPosition(): LatLng
  }

  // 지도 클릭 등 마우스 이벤트가 넘겨주는 객체
  interface MouseEvent {
    latLng: LatLng
  }

  interface CustomOverlayOptions {
    position: LatLng
    content: string | HTMLElement
    map?: Map
    xAnchor?: number
    yAnchor?: number
    zIndex?: number
    clickable?: boolean
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions)
    setMap(map: Map | null): void
    setPosition(position: LatLng): void
  }

  namespace event {
    function addListener(target: object, type: string, handler: (...args: unknown[]) => void): void
    function removeListener(target: object, type: string, handler: (...args: unknown[]) => void): void
  }

  function load(callback: () => void): void

  // libraries=services 로 로드되는 장소검색·주소변환 API
  namespace services {
    type Status = 'OK' | 'ZERO_RESULT' | 'ERROR'
    const Status: { OK: 'OK'; ZERO_RESULT: 'ZERO_RESULT'; ERROR: 'ERROR' }

    interface PlacesSearchResultItem {
      id: string
      place_name: string
      address_name: string
      road_address_name: string
      category_name: string
      x: string // 경도(lng)
      y: string // 위도(lat)
    }

    class Places {
      keywordSearch(
        keyword: string,
        callback: (result: PlacesSearchResultItem[], status: Status) => void,
      ): void
    }

    interface Coord2AddressResultItem {
      address: { address_name: string } | null
      road_address: { address_name: string } | null
    }

    class Geocoder {
      coord2Address(
        lng: number,
        lat: number,
        callback: (result: Coord2AddressResultItem[], status: Status) => void,
      ): void
    }
  }
}

interface Window {
  kakao: typeof kakao
}
