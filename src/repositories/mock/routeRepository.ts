import type { RouteRepository } from '../types'
import { MOCK_ROUTE } from '@/mocks'
import { mockDelay } from './delay'

export const mockRouteRepository: RouteRepository = {
  async getRecommended() {
    return mockDelay(MOCK_ROUTE)
  },
}
