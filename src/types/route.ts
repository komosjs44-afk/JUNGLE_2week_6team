import type { Spot } from './spot'

export interface RouteSpot {
  order: number
  spot: Spot
  arrivalTime: string
  walkMinutesToNext?: number
}

export interface Route {
  id: string
  title: string
  description: string
  spots: RouteSpot[]
  totalDistanceKm: number
  totalDurationMinutes: number
  createdAt: string
}
