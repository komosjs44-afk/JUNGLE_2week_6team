import { useAuthStore } from '@/stores'
import { useIsFollowing, useFollowMutation } from '@/hooks'
import { Button } from './Button'

interface FollowButtonProps {
  targetUserId: string
  className?: string
  fullWidth?: boolean
}

export function FollowButton({ targetUserId, className, fullWidth }: FollowButtonProps) {
  const myId = useAuthStore((s) => s.user?.id)
  const isFollowing = useIsFollowing(targetUserId)
  const mutation = useFollowMutation()

  if (!myId || myId === targetUserId) return null

  return (
    <Button
      variant={isFollowing ? 'secondary' : 'primary'}
      fullWidth={fullWidth}
      className={className}
      loading={mutation.isPending}
      onClick={(e) => {
        // 목록 row 안에서 쓰일 때 row의 클릭(프로필 이동)으로 번지지 않게 막음
        e.stopPropagation()
        mutation.mutate({ targetId: targetUserId, isFollowing })
      }}
    >
      {isFollowing ? '팔로잉' : '팔로우'}
    </Button>
  )
}
