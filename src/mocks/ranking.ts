import type { RankingEntry, RankingTab } from '@/types'
import { MOCK_SPOTS } from './spots'
import { MOCK_REFERENCES } from './references'

function totalLikesForSpot(spotId: string): number {
  return MOCK_REFERENCES.filter((r) => r.spotId === spotId).reduce((sum, r) => sum + r.likeCount, 0)
}

const BASE_ENTRIES: RankingEntry[] = MOCK_SPOTS.map((spot) => ({
  rank: 0,
  spot,
  tags: spot.tags,
  likeCount: totalLikesForSpot(spot.id),
  referenceCount: spot.referenceCount,
}))

function withRank(entries: RankingEntry[]): RankingEntry[] {
  return entries.map((e, i) => ({ ...e, rank: i + 1 }))
}

export function getRankingEntries(tab: RankingTab): RankingEntry[] {
  if (tab === 'new') {
    const sorted = [...BASE_ENTRIES].sort(
      (a, b) => new Date(b.spot.createdAt).getTime() - new Date(a.spot.createdAt).getTime(),
    )
    return withRank(sorted)
  }
  if (tab === 'rising') {
    const sorted = [...BASE_ENTRIES].sort((a, b) => b.referenceCount - a.referenceCount)
    return withRank(sorted)
  }
  const sorted = [...BASE_ENTRIES].sort((a, b) => b.likeCount - a.likeCount)
  return withRank(sorted)
}
