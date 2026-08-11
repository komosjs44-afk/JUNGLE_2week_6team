import { MapPin } from 'lucide-react'
import { clsx } from 'clsx'
import type { Spot } from '@/types'

// Default framing (roughly central Seoul) — used for the general map fallback (MapPage) where
// there's no specific set of points to frame.
const DEFAULT_LAT_RANGE: [number, number] = [37.52, 37.59]
const DEFAULT_LNG_RANGE: [number, number] = [126.98, 127.07]

interface Bounds {
  latRange: [number, number]
  lngRange: [number, number]
}

// Frame tightly around a set of points (a route), with padding so pins don't sit on the edge.
// Degenerate spans (all points at one coordinate) get a minimum window so projection stays sane.
function boundsFromPoints(points: { latitude: number; longitude: number }[]): Bounds {
  const lats = points.map((p) => p.latitude)
  const lngs = points.map((p) => p.longitude)
  const latPad = Math.max((Math.max(...lats) - Math.min(...lats)) * 0.25, 0.002)
  const lngPad = Math.max((Math.max(...lngs) - Math.min(...lngs)) * 0.25, 0.002)
  return {
    latRange: [Math.min(...lats) - latPad, Math.max(...lats) + latPad],
    lngRange: [Math.min(...lngs) - lngPad, Math.max(...lngs) + lngPad],
  }
}

function project(bounds: Bounds, lat: number, lng: number): { left: number; top: number } {
  const x = ((lng - bounds.lngRange[0]) / (bounds.lngRange[1] - bounds.lngRange[0])) * 100
  const y = 100 - ((lat - bounds.latRange[0]) / (bounds.latRange[1] - bounds.latRange[0])) * 100
  // clamp inside a padded frame so markers/labels never clip at the edges
  return { left: Math.min(90, Math.max(10, x)), top: Math.min(88, Math.max(12, y)) }
}

interface MockMapProps {
  spots: Spot[]
  selectedSpotId: string | null
  onSelectSpot: (spotId: string) => void
  /** Ordered points to connect with a line — draws a route path and frames the map to fit them. */
  path?: { latitude: number; longitude: number }[] | null
  /** Spot id → visit order number; shows a numbered badge instead of a plain pin. */
  spotOrder?: Record<string, number>
}

export function MockMap({ spots, selectedSpotId, onSelectSpot, path = null, spotOrder }: MockMapProps) {
  const isRoute = !!path && path.length > 0
  const bounds: Bounds = isRoute
    ? boundsFromPoints(path)
    : { latRange: DEFAULT_LAT_RANGE, lngRange: DEFAULT_LNG_RANGE }

  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-100">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-neutral-200) 1px, transparent 1px), linear-gradient(90deg, var(--color-neutral-200) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Route path line connecting the stops in order */}
      {isRoute && path.length >= 2 && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={path
              .map((p) => {
                const { left, top } = project(bounds, p.latitude, p.longitude)
                return `${left},${top}`
              })
              .join(' ')}
            fill="none"
            stroke="var(--color-primary-600)"
            strokeWidth="1"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 3 }}
          />
        </svg>
      )}

      {/* "You are here" dot only makes sense on the general map, not a route overview */}
      {!isRoute && (
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div className="h-3 w-3 rounded-full bg-primary-600 ring-4 ring-primary-200" />
          <span className="mt-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-500 shadow-sm">
            내 위치
          </span>
        </div>
      )}

      {spots.map((spot) => {
        const { left, top } = project(bounds, spot.latitude, spot.longitude)
        const isSelected = spot.id === selectedSpotId
        const order = spotOrder?.[spot.id]
        return (
          <button
            key={spot.id}
            type="button"
            onClick={() => onSelectSpot(spot.id)}
            style={{ left: `${left}%`, top: `${top}%` }}
            className={clsx(
              'absolute -translate-x-1/2',
              order !== undefined ? '-translate-y-1/2' : '-translate-y-full',
            )}
          >
            <div className={clsx('flex flex-col items-center transition-transform', isSelected && 'scale-110')}>
              {order !== undefined ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary-600 text-sm font-bold text-white shadow-md">
                  {order}
                </div>
              ) : (
                <div
                  className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-full shadow-md',
                    isSelected ? 'bg-primary-600 text-white' : 'bg-white text-primary-600',
                  )}
                >
                  <MapPin size={18} fill="currentColor" className={isSelected ? 'text-white' : 'text-primary-600'} />
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
