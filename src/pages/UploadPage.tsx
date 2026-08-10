import { useRef, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImagePlus } from 'lucide-react'
import { useUploadWizardStore } from '@/stores'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'

export function UploadPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { file, previewUrl, setFile, setExif } = useUploadWizardStore()

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setExif(null, 'idle')
    setFile(selected, URL.createObjectURL(selected))
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

        {previewUrl ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-100"
          >
            <img src={previewUrl} alt="선택한 사진" className="h-full w-full object-cover" />
            <span className="absolute right-2 bottom-2 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
              다른 사진 선택
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-200 text-neutral-400"
          >
            <ImagePlus size={32} />
            <span className="text-sm font-medium">탭해서 사진 선택하기</span>
          </button>
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
