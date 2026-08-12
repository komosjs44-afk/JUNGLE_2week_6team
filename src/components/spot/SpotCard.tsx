import { Link } from 'react-router-dom'
import { Heart, Images } from 'lucide-react'
import { clsx } from 'clsx'
import type { Spot } from '@/types'
import { useSaveStore, useMemberGateStore } from '@/stores'

export function SpotCard({ spot }: { spot: Spot }) {
  const isSaved = useSaveStore((s) => s.isSpotSaved(spot.id))
  const toggleSave = useSaveStore((s) => s.toggleSpotSave)
  const requireMember = useMemberGateStore((s) => s.requireMember)

  return (
    <Link to={`/spots/${spot.id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[6px] bg-neutral-100">
        <img src={spot.imageUrl} alt={spot.name} loading="lazy" className="h-full w-full object-cover" />
        <button
          type="button"
          aria-label={isSaved ? '저장 취소' : '저장'}
          onClick={(e) => {
            e.preventDefault()
            if (!requireMember()) return
            toggleSave(spot.id)
          }}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
        >
          <Heart size={16} className={clsx(isSaved && 'fill-white')} />
        </button>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-neutral-900">{spot.name}</p>
        <p className="flex items-center gap-1 truncate text-xs text-neutral-400">
          <Images size={11} />
          참고 사진 {spot.referenceCount}개
        </p>
      </div>
    </Link>
  )
}
