import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Camera, Compass, Heart, MapPin, MessageCircle, ScanLine, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { useReference } from '@/hooks'
import { useSaveStore } from '@/stores'
import { PageHeader } from '@/components/layout/PageHeader'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'
import { IconButton } from '@/components/common/IconButton'
import { Tag } from '@/components/common/Tag'
import { Avatar } from '@/components/common/Avatar'
import { Accordion } from '@/components/common/Accordion'
import { Skeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import { formatDirection } from '@/utils/direction'
import { formatDaypart, formatFocalLength, formatLikeCount, formatTimeOfDay } from '@/utils/format'

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        {icon}
      </div>
      <div>
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-neutral-900">{value}</p>
      </div>
    </div>
  )
}

export function ReferenceDetailPage() {
  const { referenceId } = useParams<{ referenceId: string }>()
  const navigate = useNavigate()
  const { data: reference, isLoading, isError, refetch } = useReference(referenceId)
  const isSaved = useSaveStore((s) => (referenceId ? s.isReferenceSaved(referenceId) : false))
  const toggleSave = useSaveStore((s) => s.toggleReferenceSave)

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }

  if (isError || !reference) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="참고 사진" />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  const timeLabel = reference.shooting.shotAt
    ? `${formatTimeOfDay(reference.shooting.shotAt)} / ${formatDaypart(reference.shooting.shotAt)}`
    : '정보 없음'

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative aspect-[3/4] w-full shrink-0 bg-neutral-100">
        <img src={reference.imageUrl} alt={reference.title} className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 top-0">
          <PageHeader
            transparent
            right={
              <IconButton
                variant="filled"
                aria-label={isSaved ? '저장 취소' : '저장'}
                onClick={() => toggleSave(reference.id)}
              >
                <Heart size={18} className={clsx(isSaved && 'fill-primary-600 text-primary-600')} />
              </IconButton>
            }
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-neutral-900">{reference.title}</h1>
            <Link to={`/spots/${reference.spot.id}`} className="mt-1 flex items-center gap-1 text-sm text-neutral-400">
              <MapPin size={13} />
              {reference.spot.name}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm text-neutral-400">
            <span className="flex items-center gap-1">
              <Heart size={14} />
              {formatLikeCount(reference.likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle size={14} />
              {reference.commentCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-neutral-400">기고자</span>
          <Link to={`/my`} className="flex items-center gap-2">
            <Avatar nickname={reference.creator.nickname} avatarUrl={reference.creator.avatarUrl} size={28} />
            <span className="text-sm font-medium text-neutral-700">{reference.creator.nickname}</span>
          </Link>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {reference.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>

        <div className="divide-y divide-neutral-100 rounded-2xl bg-neutral-50 px-4">
          <InfoRow icon={<MapPin size={15} />} label="촬영 위치" value={reference.spot.name} />
          <InfoRow icon={<Sparkles size={15} />} label="촬영 시간" value={timeLabel} />
          <InfoRow
            icon={<Compass size={15} />}
            label="촬영 방향"
            value={formatDirection(reference.shooting.direction)}
          />
          <InfoRow
            icon={<ScanLine size={15} />}
            label="화각"
            value={formatFocalLength(reference.shooting.focalLength)}
          />
        </div>

        {reference.shooting.creatorTip && (
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
            <p className="mb-1 text-xs font-medium text-primary-600">기고자 팁</p>
            <p className="text-sm leading-relaxed text-neutral-700">{reference.shooting.creatorTip}</p>
          </div>
        )}

        {reference.exif && (
          <Accordion title="EXIF 상세 정보">
            <div className="flex flex-col gap-2 text-sm">
              {[
                ['Camera', [reference.exif.cameraMake, reference.exif.cameraModel].filter(Boolean).join(' ')],
                ['Lens', reference.exif.lensModel],
                ['Aperture', reference.exif.aperture ? `F${reference.exif.aperture}` : undefined],
                ['ISO', reference.exif.iso],
                ['Shutter', reference.exif.shutterSpeed],
              ]
                .filter(([, value]) => !!value)
                .map(([label, value]) => (
                  <div key={label as string} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <Camera size={13} />
                      {label}
                    </span>
                    <span className="font-medium text-neutral-900">{value}</span>
                  </div>
                ))}
            </div>
          </Accordion>
        )}
      </div>

      <StickyActionBar>
        <Button variant="secondary" fullWidth onClick={() => toggleSave(reference.id)}>
          <Heart size={16} className={clsx(isSaved && 'fill-primary-600 text-primary-600')} />
          {isSaved ? '저장됨' : '저장'}
        </Button>
        <Button fullWidth onClick={() => navigate(`/references/${reference.id}/recreate`)}>
          이 사진처럼 찍기
        </Button>
      </StickyActionBar>
    </div>
  )
}
