import { useUploadWizardStore } from '@/stores'

/**
 * 업로드 마법사 각 단계 상단에 "지금 올리는 내 사진"을 보여주는 썸네일.
 * previewUrl 이 없으면 아무것도 렌더하지 않는다.
 */
export function UploadPhotoPreview() {
  const previewUrl = useUploadWizardStore((s) => s.previewUrl)
  if (!previewUrl) return null
  return (
    <div className="px-4 pt-3">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-100">
        <img src={previewUrl} alt="업로드할 사진" className="h-40 w-full object-cover" />
        <span className="absolute top-2 left-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          내 사진
        </span>
      </div>
    </div>
  )
}
