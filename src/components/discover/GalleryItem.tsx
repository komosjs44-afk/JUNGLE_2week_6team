import { Link } from 'react-router-dom'
import type { Reference } from '@/types'
import { clampFeedAspectRatio } from '@/utils/aspectRatio'

// 갤러리 썸네일 — 사진만. 클릭하면 해당 사진의 상세 페이지(/references/:id)로 이동한다.
// 원본 비율 유지(과도한 세로/가로는 clampFeedAspectRatio로 완만하게 제한), 모서리는 직각(radius 0).
export function GalleryItem({ reference }: { reference: Reference }) {
  return (
    <Link
      to={`/references/${reference.id}`}
      aria-label={`${reference.title || reference.spot.name} 상세 보기`}
      style={{ aspectRatio: clampFeedAspectRatio(reference.aspectRatio) }}
      className="group block w-full self-start overflow-hidden rounded-[6px] bg-neutral-100"
    >
      <img
        src={reference.imageUrl}
        alt={reference.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-200 group-active:scale-[0.98]"
      />
    </Link>
  )
}
