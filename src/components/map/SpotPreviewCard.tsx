import { Link } from 'react-router-dom'
import { Heart, Images } from 'lucide-react'
import { clsx } from 'clsx'
import type { Spot } from '@/types'
import { useSaveStore, useMemberGateStore } from '@/stores'
import { Tag } from '@/components/common/Tag'

export function SpotPreviewCard({ spot }: { spot: Spot }) {
  const isSaved = useSaveStore((s) => s.isSpotSaved(spot.id))
  const toggleSave = useSaveStore((s) => s.toggleSpotSave)
  const requireMember = useMemberGateStore((s) => s.requireMember)

  return (
    <Link
      to={`/spots/${spot.id}`}
      className="flex gap-3 rounded-[12px] border border-neutral-100 bg-white p-3 shadow-sm shadow-black/5"
    >
      <img src={spot.imageUrl} alt={spot.name} className="h-20 w-20 shrink-0 rounded-[6px] object-cover" />
      <div className="flex flex-1 flex-col justify-between overflow-hidden">
        <div>
          <p className="truncate text-sm font-semibold text-neutral-900">{spot.name}</p>
          <div className="mt-1 flex gap-1 overflow-hidden">
            {spot.tags.slice(0, 3).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <Images size={12} />
            참고 사진 {spot.referenceCount}개
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label={isSaved ? '저장 취소' : '저장'}
        onClick={(e) => {
          e.preventDefault()
          if (!requireMember()) return
          toggleSave(spot.id)
        }}
        className="flex h-9 w-9 shrink-0 items-center justify-center self-start rounded-full text-neutral-300"
      >
        <Heart size={18} className={clsx(isSaved && 'fill-primary-600 text-primary-600')} />
      </button>
    </Link>
  )
}
