import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { followService } from '@/services'
import { useAuthStore } from '@/stores'
import type { FollowCounts } from '@/types'

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ['follow-counts', userId],
    queryFn: () => followService.getCounts(userId as string),
    enabled: !!userId,
  })
}

// 로그인한 내가 팔로우 중인 유저 id 목록 — isFollowing 판정의 단일 소스
export function useMyFollowingIds() {
  const myId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['my-following-ids', myId],
    queryFn: () => followService.listFollowingIds(myId as string),
    enabled: !!myId,
  })
}

export function useIsFollowing(targetId: string) {
  const { data } = useMyFollowingIds()
  return data?.includes(targetId) ?? false
}

export function useFollowers(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: () => followService.listFollowers(userId as string),
    enabled: !!userId && enabled,
  })
}

export function useFollowing(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: () => followService.listFollowing(userId as string),
    enabled: !!userId && enabled,
  })
}

interface ToggleFollowInput {
  targetId: string
  isFollowing: boolean
}

interface ToggleFollowContext {
  prevIds: string[] | undefined
  prevTargetCounts: FollowCounts | undefined
  prevMyCounts: FollowCounts | undefined
}

// follow/unfollow 낙관적 업데이트: 버튼 상태·카운트가 서버 응답을 기다리지 않고 즉시 반영됨
export function useFollowMutation() {
  const queryClient = useQueryClient()
  const myId = useAuthStore((s) => s.user?.id)

  return useMutation<void, Error, ToggleFollowInput, ToggleFollowContext>({
    mutationFn: async ({ targetId, isFollowing }) => {
      if (!myId) throw new Error('로그인이 필요해요.')
      if (isFollowing) await followService.unfollow(myId, targetId)
      else await followService.follow(myId, targetId)
    },
    onMutate: async ({ targetId, isFollowing }) => {
      if (!myId) return { prevIds: undefined, prevTargetCounts: undefined, prevMyCounts: undefined }

      await queryClient.cancelQueries({ queryKey: ['my-following-ids', myId] })

      const prevIds = queryClient.getQueryData<string[]>(['my-following-ids', myId])
      const prevTargetCounts = queryClient.getQueryData<FollowCounts>(['follow-counts', targetId])
      const prevMyCounts = queryClient.getQueryData<FollowCounts>(['follow-counts', myId])

      queryClient.setQueryData<string[]>(['my-following-ids', myId], (ids = []) =>
        isFollowing ? ids.filter((id) => id !== targetId) : [...ids, targetId],
      )
      const delta = isFollowing ? -1 : 1
      queryClient.setQueryData<FollowCounts>(['follow-counts', targetId], (c) =>
        c ? { ...c, followers: Math.max(0, c.followers + delta) } : c,
      )
      queryClient.setQueryData<FollowCounts>(['follow-counts', myId], (c) =>
        c ? { ...c, following: Math.max(0, c.following + delta) } : c,
      )

      return { prevIds, prevTargetCounts, prevMyCounts }
    },
    onError: (_err, { targetId }, ctx) => {
      if (!myId || !ctx) return
      queryClient.setQueryData(['my-following-ids', myId], ctx.prevIds)
      queryClient.setQueryData(['follow-counts', targetId], ctx.prevTargetCounts)
      queryClient.setQueryData(['follow-counts', myId], ctx.prevMyCounts)
    },
    onSettled: (_data, _err, { targetId }) => {
      queryClient.invalidateQueries({ queryKey: ['followers', targetId] })
      if (myId) queryClient.invalidateQueries({ queryKey: ['following', myId] })
    },
  })
}
