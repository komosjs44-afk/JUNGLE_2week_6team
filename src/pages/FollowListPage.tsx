import { useParams } from 'react-router-dom'
import { useFollowers, useFollowing } from '@/hooks'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { ListRowSkeleton } from '@/components/common/Skeleton'
import { UserListRow } from '@/components/common/UserListRow'

interface FollowListPageProps {
  mode: 'followers' | 'following'
}

export function FollowListPage({ mode }: FollowListPageProps) {
  const { userId } = useParams<{ userId: string }>()
  const followersQuery = useFollowers(userId, mode === 'followers')
  const followingQuery = useFollowing(userId, mode === 'following')
  const { data: users, isLoading, isError, refetch } = mode === 'followers' ? followersQuery : followingQuery

  const title = mode === 'followers' ? '팔로워' : '팔로잉'
  const emptyTitle = mode === 'followers' ? '아직 팔로워가 없어요.' : '아직 팔로우한 사용자가 없어요.'

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={title} />

      {isLoading ? (
        <div className="flex flex-col gap-4 px-4 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !users || users.length === 0 ? (
        <EmptyState title={emptyTitle} />
      ) : (
        <div className="divide-y divide-neutral-100">
          {users.map((u) => (
            <UserListRow key={u.id} user={u} />
          ))}
        </div>
      )}
    </div>
  )
}
