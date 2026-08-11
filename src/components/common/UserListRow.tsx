import { useNavigate } from 'react-router-dom'
import type { User } from '@/types'
import { Avatar } from './Avatar'
import { FollowButton } from './FollowButton'

export function UserListRow({ user }: { user: User }) {
  const navigate = useNavigate()

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/users/${user.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/users/${user.id}`)
      }}
      className="flex items-center gap-3 px-4 py-3 active:bg-neutral-50"
    >
      <Avatar nickname={user.nickname} avatarUrl={user.avatarUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900">{user.nickname}</p>
        {user.bio && <p className="truncate text-xs text-neutral-400">{user.bio}</p>}
      </div>
      <FollowButton targetUserId={user.id} />
    </div>
  )
}
