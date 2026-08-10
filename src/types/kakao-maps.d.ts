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

  function load(callback: () => void): void
}

interface Window {
  kakao: typeof kakao
}
