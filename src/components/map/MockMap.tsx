import { MapPin } from 'lucide-react'
import { clsx } from 'clsx'
import type { Spot } from '@/types'

const LAT_RANGE: [number, number] = [37.52, 37.59]
const LNG_RANGE: [number, number] = [126.98, 127.07]

function toPosition(spot: Spot): { left: string; top: string } {
  const x = ((spot.longitude - LNG_RANGE[0]) / (LNG_RANGE[1] - LNG_RANGE[0])) * 100
  const y = 100 - ((spot.latitude - LAT_RANGE[0]) / (LAT_RANGE[1] - LAT_RANGE[0])) * 100
  return { left: `${Math.min(82, Math.max(18, x))}%`, top: `${Math.min(85, Math.max(15, y))}%` }
}

interface MockMapProps {
  spots: Spot[]
  selectedSpotId: string | null
  onSelectSpot: (spotId: string) => void
}

export function MockMap({ spots, selectedSpotId, onSelectSpot }: MockMapProps) {
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

      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="h-3 w-3 rounded-full bg-primary-600 ring-4 ring-primary-200" />
        <span className="mt-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-500 shadow-sm">
          내 위치
        </span>
      </div>

      {spots.map((spot) => {
        const pos = toPosition(spot)
        const isSelected = spot.id === selectedSpotId
        return (
          <button
            key={spot.id}
            type="button"
            onClick={() => onSelectSpot(spot.id)}
            style={pos}
            className="absolute -translate-x-1/2 -translate-y-full"
          >
            <div
              className={clsx(
                'flex flex-col items-center transition-transform',
                isSelected && 'scale-110',
              )}
            >
              <div
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full shadow-md',
                  isSelected ? 'bg-primary-600 text-white' : 'bg-white text-primary-600',
                )}
              >
                <MapPin size={18} fill="currentColor" className={isSelected ? 'text-white' : 'text-primary-600'} />
              </div>
              <span
                className={clsx(
                  'mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap shadow-sm',
                  isSelected ? 'bg-primary-600 text-white' : 'bg-white text-neutral-700',
                )}
              >
                {spot.name}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
