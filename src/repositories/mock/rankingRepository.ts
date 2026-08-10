import type { RankingRepository } from '../types'
import { getRankingEntries } from '@/mocks'
import { mockDelay } from './delay'

export const mockRankingRepository: RankingRepository = {
  async getEntries(tab) {
    return mockDelay(getRankingEntries(tab))
  },
}
