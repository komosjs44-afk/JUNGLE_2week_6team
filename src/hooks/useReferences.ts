import { useQuery } from '@tanstack/react-query'
import { referenceService } from '@/services'
import type { DiscoverTab } from '@/repositories/types'

export function useReferences(tab: DiscoverTab) {
  return useQuery({
    queryKey: ['references', tab],
    queryFn: () => referenceService.list(tab),
  })
}

export function useReference(id: string | undefined) {
  return useQuery({
    queryKey: ['reference', id],
    queryFn: () => referenceService.getById(id as string),
    enabled: !!id,
  })
}

export function useAllReferences() {
  return useQuery({
    queryKey: ['references', 'all'],
    queryFn: () => referenceService.list(),
  })
}

export function useReferencesBySpot(spotId: string | undefined) {
  return useQuery({
    queryKey: ['references', 'spot', spotId],
    queryFn: () => referenceService.getBySpotId(spotId as string),
    enabled: !!spotId,
  })
}
