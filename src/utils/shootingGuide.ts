import type { Reference, ShootingGuide } from '@/types'
import { formatDirection } from './direction'
import { formatFocalLength, formatTimeOfDay } from './format'

// Deterministic pseudo-distance derived from the reference id, standing in for a
// real GPS-to-spot distance calculation until live location is wired up.
function mockDistanceMeters(referenceId: string): number {
  let hash = 0
  for (let i = 0; i < referenceId.length; i++) {
    hash = (hash * 31 + referenceId.charCodeAt(i)) % 1000
  }
  return 60 + (hash % 400)
}

function timeRangeAround(isoString: string | undefined): string {
  if (!isoString) return '정보 없음'
  const center = new Date(isoString)
  const start = new Date(center.getTime() - 15 * 60 * 1000)
  const end = new Date(center.getTime() + 15 * 60 * 1000)
  return `${formatTimeOfDay(start.toISOString())}~${formatTimeOfDay(end.toISOString())}`
}

export function buildShootingGuide(reference: Reference): ShootingGuide {
  const direction = reference.shooting.direction ?? 0

  return {
    distanceMeters: mockDistanceMeters(reference.id),
    direction,
    directionLabel: formatDirection(direction),
    recommendedTimeRange: timeRangeAround(reference.shooting.shotAt),
    recommendedFocalLength: formatFocalLength(reference.shooting.focalLength),
    compositionTip: reference.shooting.creatorTip ?? '구도 팁이 등록되지 않았어요.',
    cameraSetting: {
      focalLength: reference.exif?.focalLength ?? reference.shooting.focalLength ?? 0,
      aperture: reference.exif?.aperture ?? 0,
      iso: reference.exif?.iso ?? 0,
      shutterSpeed: String(reference.exif?.shutterSpeed ?? '-'),
    },
  }
}
