import { useUploadWizardStore } from '@/stores'

/**
 * 업로드 마법사 각 단계 상단에 "지금 올리는 내 사진"을 크게 보여주는 미리보기.
 * 인스타처럼 가로를 꽉 채우고, 세로는 사진 비율대로(잘림 없음). 길면 스크롤.
 */
export function UploadPhotoPreview() {
  const previewUrl = useUploadWizardStore((s) => s.previewUrl)
  const adjustedPreviewUrl = useUploadWizardStore((s) => s.adjustedPreviewUrl)
  const displayUrl = adjustedPreviewUrl ?? previewUrl
  if (!displayUrl) return null
  return (
    <div className="relative bg-neutral-100">
      <img
        src={displayUrl}
        alt="업로드할 사진"
        className="mx-auto block max-h-[75vh] w-full object-contain"
      />
      <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
        내 사진
      </span>
    </div>
  )
}
