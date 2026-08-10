import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useReference } from '@/hooks'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/common/Tabs'
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { GuideTab } from '@/components/recreate/GuideTab'
import { ShootingModeTab } from '@/components/recreate/ShootingModeTab'
import { AdjustmentTab } from '@/components/recreate/AdjustmentTab'

type RecreateTab = 'guide' | 'mode' | 'adjustment'

const TAB_ITEMS: { value: RecreateTab; label: string }[] = [
  { value: 'guide', label: '가이드' },
  { value: 'mode', label: '촬영 모드' },
  { value: 'adjustment', label: '보정' },
]

export function RecreatePage() {
  const { referenceId } = useParams<{ referenceId: string }>()
  const { data: reference, isLoading, isError, refetch } = useReference(referenceId)
  const [tab, setTab] = useState<RecreateTab>('guide')

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="촬영 가이드" />

      {isLoading && (
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {reference && (
        <>
          <div className="border-b border-neutral-100 px-4 py-3">
            <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />
          </div>
          {tab === 'guide' && <GuideTab reference={reference} />}
          {tab === 'mode' && <ShootingModeTab />}
          {tab === 'adjustment' && <AdjustmentTab reference={reference} />}
        </>
      )}
    </div>
  )
}
