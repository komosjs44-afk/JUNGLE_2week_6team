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
    setBounds(bounds: LatLngBounds): void
    relayout(): void
  }

  /** Accumulates LatLng points so the map can frame all of them (see Map.setBounds). */
  class LatLngBounds {
    constructor()
    extend(latlng: LatLng): void
    isEmpty(): boolean
  }

  interface PolylineOptions {
    path: LatLng[]
    map?: Map
    strokeWeight?: number
    strokeColor?: string
    strokeOpacity?: number
    strokeStyle?: string
  }

  /** A line connecting an ordered list of points — used to draw a route path. */
  class Polyline {
    constructor(options: PolylineOptions)
    setMap(map: Map | null): void
    setPath(path: LatLng[]): void
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map
    title?: string
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
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

  /** Payload of a Map 'click' event — only the field this project actually reads. */
  interface MapMouseEvent {
    latLng: LatLng
  }

  function load(callback: () => void): void

  // Loaded via the SDK script's &libraries=services query param (see kakaoMapsLoader.ts).
  namespace services {
    type Status = 'OK' | 'ZERO_RESULT' | 'ERROR'

    interface Coord2AddressResultItem {
      address: {
        address_name: string
        region_1depth_name: string
        region_2depth_name: string
        region_3depth_name: string
      } | null
      road_address: {
        address_name: string
      } | null
    }

    class Geocoder {
      coord2Address(
        lng: number,
        lat: number,
        callback: (result: Coord2AddressResultItem[], status: Status) => void,
      ): void
    }

    interface PlacesSearchResultItem {
      id: string
      place_name: string
      address_name: string
      road_address_name: string
      x: string
      y: string
    }

    class Places {
      keywordSearch(
        keyword: string,
        callback: (data: PlacesSearchResultItem[], status: Status, pagination: unknown) => void,
      ): void
    }
  }
}

interface Window {
  kakao: typeof kakao
}
