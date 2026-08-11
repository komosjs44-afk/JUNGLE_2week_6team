import { Link, useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { clsx } from 'clsx'
import type { Reference } from '@/types'
import { useSaveStore, useMemberGateStore } from '@/stores'
import { formatLikeCount } from '@/utils/format'
import { clampFeedAspectRatio } from '@/utils/aspectRatio'
import { Avatar } from '@/components/common/Avatar'

export function ReferenceCard({ reference }: { reference: Reference }) {
  const navigate = useNavigate()
  const isSaved = useSaveStore((s) => s.isReferenceSaved(reference.id))
  const toggleSave = useSaveStore((s) => s.toggleReferenceSave)
  const requireMember = useMemberGateStore((s) => s.requireMember)

  return (
    <Link to={`/references/${reference.id}`} className="group flex flex-col gap-2">
      <div
        style={{ aspectRatio: clampFeedAspectRatio(reference.aspectRatio) }}
        className="relative w-full overflow-hidden rounded-lg bg-neutral-100"
      >
        <img
          src={reference.imageUrl}
          alt={reference.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform group-active:scale-[0.98]"
        />
        <button
          type="button"
          aria-label={isSaved ? '저장 취소' : '저장'}
          onClick={(e) => {
            e.preventDefault()
            if (!requireMember()) return
            toggleSave(reference.id)
          }}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
        >
          <Heart size={16} className={clsx(isSaved && 'fill-white')} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-neutral-900">{reference.title}</p>
        <p className="truncate text-xs text-neutral-400">{reference.spot.name}</p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            navigate(`/users/${reference.creator.id}`)
          }}
          className="flex items-center gap-1 self-start text-xs text-neutral-400"
        >
          <Avatar nickname={reference.creator.nickname} avatarUrl={reference.creator.avatarUrl} size={14} />
          <span className="truncate">{reference.creator.nickname}</span>
        </button>
        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <Heart size={11} />
          <span>{formatLikeCount(reference.likeCount)}</span>
        </div>
      </div>
    </Link>
  )
}
