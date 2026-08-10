import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Info } from 'lucide-react'
import { useUploadWizardStore } from '@/stores'
import { analyzeExif } from '@/features/exif/analyzeExif'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProgressBar } from '@/components/common/ProgressBar'
import { StickyActionBar } from '@/components/layout/StickyActionBar'
import { Button } from '@/components/common/Button'

const EXIF_ROWS: { key: 'cameraMake' | 'cameraModel' | 'lensModel' | 'aperture' | 'iso' | 'shutterSpeed'; label: string }[] = [
  { key: 'cameraMake', label: 'Camera' },
  { key: 'lensModel', label: 'Lens' },
  { key: 'aperture', label: 'F' },
  { key: 'iso', label: 'ISO' },
  { key: 'shutterSpeed', label: 'Shutter' },
]

export function UploadExifPage() {
  const navigate = useNavigate()
  const { file, exif, exifStatus, setExif } = useUploadWizardStore()

  useEffect(() => {
    if (!file) {
      navigate('/upload', { replace: true })
      return
    }
    if (exifStatus !== 'idle') return

    setExif(null, 'analyzing')
    analyzeExif(file).then((result) => {
      setExif(result.exif, result.found ? 'found' : 'not_found')
    })
    // Only re-run when the wizard moves on to a different file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="촬영 정보 분석" />
      <ProgressBar step={2} total={5} />

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        {exifStatus === 'analyzing' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <p className="text-sm text-neutral-500">촬영 정보를 분석하고 있어요...</p>
          </div>
        )}

        {exifStatus === 'found' && exif && (
          <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-primary-700">
              <CheckCircle2 size={16} />
              촬영 정보를 자동으로 추출했어요!
            </p>
            <div className="flex flex-col gap-2 text-sm">
              {EXIF_ROWS.map(({ key, label }) => {
                const value = exif[key]
                if (!value) return null
                return (
                  <div key={key} className="flex justify-between">
                    <span className="text-neutral-500">{label}</span>
                    <span className="font-medium text-neutral-900">
                      {key === 'aperture' ? `F${value}` : value}
                    </span>
                  </div>
                )
              })}
              <div className="flex justify-between">
                <span className="text-neutral-500">GPS</span>
                <span className="font-medium text-neutral-900">
                  {exif.latitude ? '감지됨' : '감지되지 않음'}
                </span>
              </div>
            </div>
          </div>
        )}

        {exifStatus === 'not_found' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
              <Info size={22} />
            </div>
            <p className="text-sm font-medium text-neutral-700">사진에서 촬영 정보를 찾지 못했어요.</p>
            <p className="text-xs text-neutral-400">위치와 촬영 정보를 직접 입력해주세요.</p>
          </div>
        )}
      </div>

      <StickyActionBar>
        <Button fullWidth disabled={exifStatus === 'analyzing' || exifStatus === 'idle'} onClick={() => navigate('/upload/location')}>
          다음
        </Button>
      </StickyActionBar>
    </div>
  )
}
