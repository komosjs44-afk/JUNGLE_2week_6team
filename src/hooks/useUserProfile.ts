import { useQuery } from '@tanstack/react-query'
import { authService } from '@/services'

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => authService.getById(userId as string),
    enabled: !!userId,
  })
}
