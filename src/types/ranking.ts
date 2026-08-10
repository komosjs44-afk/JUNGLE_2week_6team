import type { Spot } from './spot'

export type RankingTab = 'top10' | 'rising' | 'new'

export interface RankingEntry {
  rank: number
  spot: Spot
  tags: string[]
  likeCount: number
  referenceCount: number
}
