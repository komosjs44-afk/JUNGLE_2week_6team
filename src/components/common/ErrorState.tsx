import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message = '정보를 불러오지 못했어요.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-danger">
        <AlertTriangle size={24} />
      </div>
      <p className="text-sm font-medium text-neutral-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="md" onClick={onRetry} className="mt-2">
          다시 시도
        </Button>
      )}
    </div>
  )
}
