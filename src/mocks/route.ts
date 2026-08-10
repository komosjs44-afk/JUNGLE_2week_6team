import type { Route } from '@/types'
import { getSpotById } from './spots'

function requireSpot(id: string) {
  const spot = getSpotById(id)
  if (!spot) throw new Error(`mock route: missing spot ${id}`)
  return spot
}

export const MOCK_ROUTE: Route = {
  id: 'route-1',
  title: '오늘의 추천 촬영 코스',
  description: '저장한 Reference를 기반으로 추천했어요.',
  spots: [
    { order: 1, spot: requireSpot('spot-1'), arrivalTime: '17:20', walkMinutesToNext: 12 },
    { order: 2, spot: requireSpot('spot-2'), arrivalTime: '18:00', walkMinutesToNext: 18 },
    { order: 3, spot: requireSpot('spot-5'), arrivalTime: '18:50' },
  ],
  totalDistanceKm: 3.8,
  totalDurationMinutes: 140,
  createdAt: '2026-08-10T08:00:00Z',
}
