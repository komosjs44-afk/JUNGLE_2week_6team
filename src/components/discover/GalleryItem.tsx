import type { Reference } from '@/types'
import { clampFeedAspectRatio } from '@/utils/aspectRatio'

// 갤러리 썸네일 — 사진만. 제목/닉네임/장소/태그/좋아요는 여기서 숨기고, 클릭 시 확장 상세로.
// 원본 비율을 유지(과도한 세로/가로는 clampFeedAspectRatio로 완만하게 제한)하고 모서리는 직각(radius 0).
export function GalleryItem({ reference, onSelect }: { reference: Reference; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${reference.title} 상세 보기`}
      style={{ aspectRatio: clampFeedAspectRatio(reference.aspectRatio) }}
      className="group block w-full self-start overflow-hidden bg-neutral-100"
    >
      <img
        src={reference.imageUrl}
        alt={reference.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-200 group-active:scale-[0.98]"
      />
    </button>
  )
}
