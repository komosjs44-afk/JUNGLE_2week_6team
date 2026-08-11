import { useQuery } from '@tanstack/react-query'
import { referenceService } from '@/services'
import type { DiscoverTab } from '@/repositories/types'
import type { Reference } from '@/types'

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

interface RootReferenceResult {
  data: Reference | undefined
  isLoading: boolean
  isDerived: boolean
}

/**
 * reference가 다른 Reference를 참고해 AI로 재현된 것(Derived)이면 그 원본을 조회해서 돌려주고,
 * 아니면 reference 자신을 그대로 돌려준다. 체인은 항상 depth 1로 평탄화되어 있다는 전제라
 * 재귀 조회하지 않는다 — 자기참조(source === 자기 id)는 안전하게 Original로 처리한다.
 */
export function useRootReference(reference: Reference | null | undefined): RootReferenceResult {
  const sourceId =
    reference?.sourceReferenceId && reference.sourceReferenceId !== reference.id
      ? reference.sourceReferenceId
      : undefined
  const sourceQuery = useReference(sourceId)

  if (!sourceId) {
    return { data: reference ?? undefined, isLoading: false, isDerived: false }
  }
  return { data: sourceQuery.data ?? undefined, isLoading: sourceQuery.isLoading, isDerived: true }
}
