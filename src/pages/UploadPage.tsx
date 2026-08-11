import { useRef, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus } from 'lucide-react'
import { clsx } from 'clsx'
import { useUploadWizardStore } from '@/stores'
import { ASPECT_RATIO_PRESETS, getImageAspectRatio, type AspectRatioOption } from '@/utils/cropImage'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'

const RATIO_LABELS: Record<AspectRatioOption, string> = {
  original: '원본',
  '1:1': '1:1',
  '4:5': '4:5',
  '3:4': '3:4',
}

export function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    file,
    previewUrl,
    adjustedPreviewUrl,
    naturalAspectRatio,
    aspectRatioOption,
    setFile,
    setExif,
    setNaturalAspectRatio,
    setAspectRatioOption,
  } = useUploadWizardStore()
  const displayUrl = adjustedPreviewUrl ?? previewUrl
  // 미리보기에 적용할 비율: 원본을 고르면 사진 그대로, 프리셋을 고르면 그 비율로(크롭은 다음 단계에서 실제 적용)
  const previewRatio = aspectRatioOption === 'original' ? naturalAspectRatio : ASPECT_RATIO_PRESETS[aspectRatioOption]

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setExif(null, 'idle')
    const url = URL.createObjectURL(selected)
    setFile(selected, url)
    try {
      setNaturalAspectRatio(await getImageAspectRatio(url))
    } catch {
      setNaturalAspectRatio(null)
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="사진 업로드" onBack={() => navigate('/')} />
      <ProgressBar step={1} total={5} />

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div>
          <h1 className="text-lg font-bold text-neutral-900">사진을 선택해주세요</h1>
          <p className="mt-1 text-sm text-neutral-400">촬영 정보를 자동으로 추출해 참고 사진을 만들어드려요.</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          className="hidden"
          onChange={handleFileChange}
        />

        {displayUrl ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{ aspectRatio: previewRatio ?? 3 / 4 }}
            className="relative w-full overflow-hidden rounded-lg bg-neutral-100"
          >
            <img src={displayUrl} alt="선택한 사진" className="h-full w-full object-cover" />
            <span className="absolute right-2 bottom-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
              다른 사진 선택
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-neutral-200 text-neutral-400"
          >
            <ImagePlus size={32} />
            <span className="text-sm font-medium">탭해서 사진 선택하기</span>
          </button>
        )}

        {displayUrl && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-700">사진 비율</span>
            <div className="flex gap-2">
              {(Object.keys(RATIO_LABELS) as AspectRatioOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAspectRatioOption(option)}
                  className={clsx(
                    'min-h-[40px] flex-1 rounded-xl border text-sm font-medium transition-colors',
                    aspectRatioOption === option
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-neutral-200 text-neutral-600',
                  )}
                >
                  {RATIO_LABELS[option]}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-400">
              원본을 고르면 사진을 자르지 않고 그대로 올려요. 다른 비율을 고르면 가운데를 기준으로 잘라요.
            </p>
          </div>
        )}
      </div>

      <StickyActionBar>
        <Button fullWidth disabled={!file} onClick={() => navigate('/upload/exif')}>
          다음
        </Button>
      </StickyActionBar>
    </div>
  )
}
