import { useQuery } from '@tanstack/react-query'
import { routeService } from '@/services'

export function useRecommendedRoute() {
  return useQuery({
    queryKey: ['route', 'recommended'],
    queryFn: () => routeService.getRecommended(),
  })
}
