import type { SpotRepository } from '../types'
import type { Spot } from '@/types'
import { MOCK_SPOTS } from '@/mocks'
import { mockDelay } from './delay'

const store: Spot[] = [...MOCK_SPOTS]

export const mockSpotRepository: SpotRepository = {
  async list(query) {
    if (!query) return mockDelay(store)
    const q = query.trim().toLowerCase()
    return mockDelay(
      store.filter((s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q))),
    )
  },

  async getById(id) {
    return mockDelay(store.find((s) => s.id === id) ?? null)
  },

  async create(input) {
    const newSpot: Spot = {
      id: `spot-new-${Date.now()}`,
      name: input.name,
      address: input.address ?? '',
      imageUrl: input.imageUrl,
      latitude: input.latitude,
      longitude: input.longitude,
      tags: input.tags ?? [],
      referenceCount: 0,
      createdAt: new Date().toISOString(),
    }
    store.unshift(newSpot)
    return mockDelay(newSpot, 500)
  },
}
