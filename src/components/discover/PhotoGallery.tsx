import type { Reference } from '@/types'
import { GalleryItem } from './GalleryItem'
import { ExpandedGalleryItem } from './ExpandedGalleryItem'

// 에디토리얼 사진 갤러리 — 기본은 사진만 보이는 2열 비대칭 그리드(직각 모서리, 높은 밀도).
// 한 사진을 선택하면 그 자리에서 전체 폭으로 확장되어 상세정보를 보여준다(모달/라우팅 없음).
// 동시에 하나만 확장되도록 selectedId 하나로 관리한다.
export function PhotoGallery({
  references,
  selectedId,
  onSelect,
  onClose,
}: {
  references: Reference[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="grid grid-cols-2 items-start gap-1">
      {references.map((reference) =>
        reference.id === selectedId ? (
          <div key={reference.id} className="col-span-2">
            <ExpandedGalleryItem reference={reference} onClose={onClose} />
          </div>
        ) : (
          <GalleryItem
            key={reference.id}
            reference={reference}
            onSelect={() => onSelect(reference.id)}
          />
        ),
      )}
    </div>
  )
}
