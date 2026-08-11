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
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-2xl bg-neutral-50">
        {/* 잘림 없이 전체가 보이도록 object-contain, 높이만 제한해서 작게 */}
        <img src={previewUrl} alt="업로드할 사진" className="max-h-36 w-auto max-w-full object-contain" />
        <span className="absolute top-2 left-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          내 사진
        </span>
      </div>
    </div>
  )
}
