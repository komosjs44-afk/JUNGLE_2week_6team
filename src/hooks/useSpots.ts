import { useQuery } from '@tanstack/react-query'
import { spotService } from '@/services'

export function useSpots(query?: string) {
  return useQuery({
    queryKey: ['spots', query ?? ''],
    queryFn: () => spotService.list(query),
  })
}

export function useSpot(id: string | undefined) {
  return useQuery({
    queryKey: ['spot', id],
    queryFn: () => spotService.getById(id as string),
    enabled: !!id,
  })
}
