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
