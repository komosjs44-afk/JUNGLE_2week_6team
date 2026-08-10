import type { MatchedSpot, Spot } from '@/types'

/**
 * How close a photo's EXIF GPS must be to a registered Spot's coordinates to count as
 * "taken near this spot". Registered spots are neighborhood-scale locations (e.g. "을지로
 * 노가리골목 일대"), so 1km comfortably covers normal GPS drift and walking the area while
 * still firmly rejecting matches from a different city — the nearest two spots in the
 * current catalog are ~1.6km apart, and a mismatched city is tens of km away.
 */
export const NEARBY_SPOT_THRESHOLD_METERS = 1000

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Finds the closest registered Spot to a photo's coordinates, but only returns it if it's
 * within NEARBY_SPOT_THRESHOLD_METERS. Having GPS does not guarantee a matching Spot exists —
 * this returns null rather than force-matching whatever happens to be least far away.
 */
export function findNearestSpot(
  target: { lat: number; lng: number },
  spots: Spot[],
): MatchedSpot | null {
  let best: Spot | null = null
  let bestDist = Infinity

  for (const spot of spots) {
    const dist = haversineMeters(target, { lat: spot.latitude, lng: spot.longitude })
    if (dist < bestDist) {
      bestDist = dist
      best = spot
    }
  }

  if (!best || bestDist > NEARBY_SPOT_THRESHOLD_METERS) return null
  return { spotId: best.id, distanceMeters: bestDist }
}
