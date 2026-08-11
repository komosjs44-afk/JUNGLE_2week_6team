import { useMutation, useQueryClient } from '@tanstack/react-query'
import { referenceService } from '@/services'

export function useCreateReference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: referenceService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] })
      queryClient.invalidateQueries({ queryKey: ['spots'] })
    },
  })
}

export function useDeleteReference() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => referenceService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references'] })
      // 삭제로 해당 스팟의 reference/like 집계가 바뀌므로 랭킹도 다시 계산되어야 함
      queryClient.invalidateQueries({ queryKey: ['ranking'] })
    },
  })
}
