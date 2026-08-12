import { useQuery } from '@tanstack/react-query'
import { leafService } from '@/services'

export function useLeafBalance(userId: string | undefined) {
  return useQuery({
    queryKey: ['leaf', 'balance', userId],
    queryFn: () => leafService.getBalance(userId as string),
    enabled: !!userId,
  })
}

export function useLeafTransactions(userId: string | undefined) {
  return useQuery({
    queryKey: ['leaf', 'transactions', userId],
    queryFn: () => leafService.listTransactions(userId as string),
    enabled: !!userId,
  })
}
