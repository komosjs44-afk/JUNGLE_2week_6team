import type { Reference } from '@/types'
import { GalleryItem } from './GalleryItem'

// 에디토리얼 사진 갤러리 — 사진만 보이는 2열 비대칭 그리드(직각 모서리, 높은 밀도).
// 사진을 누르면 그 사진의 상세 페이지로 이동한다(제자리 확장 아님).
export function PhotoGallery({ references }: { references: Reference[] }) {
  return (
    <div className="grid grid-cols-2 items-start gap-1">
      {references.map((reference) => (
        <GalleryItem key={reference.id} reference={reference} />
      ))}
    </div>
  )
}
