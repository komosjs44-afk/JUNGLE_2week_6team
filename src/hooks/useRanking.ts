import { useQuery } from '@tanstack/react-query'
import { rankingService } from '@/services'
import type { RankingTab } from '@/types'

export function useRanking(tab: RankingTab) {
  return useQuery({
    queryKey: ['ranking', tab],
    queryFn: () => rankingService.getEntries(tab),
  })
}
