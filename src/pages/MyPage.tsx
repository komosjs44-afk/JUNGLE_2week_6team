import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore, useSaveStore } from '@/stores'
import { useAllReferences, useSpots } from '@/hooks'
import { Avatar } from '@/components/common/Avatar'
import { Tabs } from '@/components/common/Tabs'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { CardGridSkeleton } from '@/components/common/Skeleton'
import { ReferenceCard } from '@/components/reference/ReferenceCard'
import { SpotCard } from '@/components/spot/SpotCard'

type SaveTab = 'reference' | 'spot'

export function MyPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { savedReferenceIds, savedSpotIds } = useSaveStore()
  const [tab, setTab] = useState<SaveTab>('reference')

  const { data: allReferences, isLoading: refsLoading } = useAllReferences()
  const { data: allSpots, isLoading: spotsLoading } = useSpots()

  const savedReferences = useMemo(
    () => allReferences?.filter((r) => savedReferenceIds.includes(r.id)) ?? [],
    [allReferences, savedReferenceIds],
  )
  const savedSpots = useMemo(
    () => allSpots?.filter((s) => savedSpotIds.includes(s.id)) ?? [],
    [allSpots, savedSpotIds],
  )
  const myReferences = useMemo(
    () => allReferences?.filter((r) => r.userId === user?.id) ?? [],
    [allReferences, user],
  )

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Avatar nickname={user.nickname} avatarUrl={user.avatarUrl} size={52} />
          <div>
            <p className="text-base font-bold text-neutral-900">{user.nickname}</p>
            {user.bio && <p className="text-xs text-neutral-400">{user.bio}</p>}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 py-4">
        <Tabs
          items={[
            { value: 'reference', label: '저장한 참고 사진' },
            { value: 'spot', label: '저장한 스팟' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'reference' &&
          (refsLoading ? (
            <CardGridSkeleton />
          ) : savedReferences.length === 0 ? (
            <EmptyState title="저장한 참고 사진이 없어요." />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {savedReferences.map((r) => (
                <ReferenceCard key={r.id} reference={r} />
              ))}
            </div>
          ))}

        {tab === 'spot' &&
          (spotsLoading ? (
            <CardGridSkeleton />
          ) : savedSpots.length === 0 ? (
            <EmptyState title="저장한 스팟이 없어요." />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {savedSpots.map((s) => (
                <SpotCard key={s.id} spot={s} />
              ))}
            </div>
          ))}
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <h2 className="text-base font-semibold text-neutral-900">내가 등록한 참고 사진</h2>
        {refsLoading ? (
          <CardGridSkeleton count={2} />
        ) : myReferences.length === 0 ? (
          <EmptyState title="아직 등록한 참고 사진이 없어요." description="첫 참고 사진을 업로드해보세요." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {myReferences.map((r) => (
              <ReferenceCard key={r.id} reference={r} />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-8">
        <Button variant="ghost" fullWidth icon={<LogOut size={16} />} onClick={handleLogout}>
          로그아웃
        </Button>
      </div>
    </div>
  )
}
