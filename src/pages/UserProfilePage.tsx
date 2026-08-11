import { useMemo, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAllReferences, useFollowCounts } from '@/hooks'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuthStore } from '@/stores'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/common/Avatar'
import { ProfileStat } from '@/components/common/ProfileStat'
import { FollowButton } from '@/components/common/FollowButton'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { CardGridSkeleton } from '@/components/common/Skeleton'
import { ReferenceCard } from '@/components/reference/ReferenceCard'

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const myId = useAuthStore((s) => s.user?.id)
  const { data: profile, isLoading, isError, refetch } = useUserProfile(userId)
  const { data: counts } = useFollowCounts(userId)
  const { data: allReferences, isLoading: refsLoading } = useAllReferences()
  const referencesRef = useRef<HTMLDivElement>(null)

  const userReferences = useMemo(
    () => allReferences?.filter((r) => r.userId === userId) ?? [],
    [allReferences, userId],
  )

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="프로필" />
        <CardGridSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="프로필" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="프로필" />
        <EmptyState title="사용자를 찾을 수 없어요." />
      </div>
    )
  }

  const isMe = profile.id === myId

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={profile.nickname} />

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex items-center gap-4">
          <Avatar nickname={profile.nickname} avatarUrl={profile.avatarUrl} size={72} />
          <div className="flex flex-1 items-center justify-around text-center">
            <ProfileStat
              value={userReferences.length}
              label="게시물"
              onClick={() => referencesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
            <ProfileStat
              value={counts?.followers ?? 0}
              label="팔로워"
              onClick={() => navigate(`/users/${profile.id}/followers`)}
            />
            <ProfileStat
              value={counts?.following ?? 0}
              label="팔로잉"
              onClick={() => navigate(`/users/${profile.id}/following`)}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-neutral-900">{profile.nickname}</p>
          {profile.bio && <p className="text-xs text-neutral-400">{profile.bio}</p>}
        </div>

        {isMe ? (
          <Button variant="secondary" fullWidth onClick={() => navigate('/settings')}>
            프로필 편집
          </Button>
        ) : (
          <FollowButton targetUserId={profile.id} fullWidth />
        )}
      </div>

      <div ref={referencesRef} className="flex flex-col gap-3 px-4 py-4">
        <h2 className="text-base font-semibold text-neutral-900">등록한 참고 사진</h2>
        {refsLoading ? (
          <CardGridSkeleton count={2} />
        ) : userReferences.length === 0 ? (
          <EmptyState title="아직 등록한 참고 사진이 없어요." compact />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {userReferences.map((r) => (
              <ReferenceCard key={r.id} reference={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
