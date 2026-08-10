import type { SpotRepository } from '../types'
import { MOCK_SPOTS, getSpotById } from '@/mocks'
import { mockDelay } from './delay'

export const mockSpotRepository: SpotRepository = {
  async list(query) {
    if (!query) return mockDelay(MOCK_SPOTS)
    const q = query.trim().toLowerCase()
    return mockDelay(
      MOCK_SPOTS.filter(
        (s) => s.name.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q)),
      ),
    )
  },

  async getById(id) {
    return mockDelay(getSpotById(id) ?? null)
  },
}
