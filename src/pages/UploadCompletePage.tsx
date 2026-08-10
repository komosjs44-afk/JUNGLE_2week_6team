import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useUploadWizardStore } from '@/stores'
import { ProgressBar } from '@/components/common/ProgressBar'
import { Button } from '@/components/common/Button'

export function UploadCompletePage() {
  const navigate = useNavigate()
  const reset = useUploadWizardStore((s) => s.reset)

  function exitTo(path: string) {
    reset()
    navigate(path)
  }

  return (
    <div className="flex flex-1 flex-col">
      <ProgressBar step={5} total={5} />

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Reference가 등록되었어요.</h1>
          <p className="mt-1 text-sm text-neutral-400">다른 사용자들이 이 사진을 보고 따라 찍을 수 있어요.</p>
        </div>
      </div>

      <div className="safe-bottom flex flex-col gap-2 px-4 pb-4">
        <Button variant="secondary" fullWidth onClick={() => exitTo('/my')}>
          내 Reference 보기
        </Button>
        <Button fullWidth onClick={() => exitTo('/')}>
          발견으로 이동
        </Button>
      </div>
    </div>
  )
}
