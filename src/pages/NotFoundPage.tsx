import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/common/Button'

export function NotFoundPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
        <Compass size={24} />
      </div>
      <div>
        <h1 className="text-lg font-bold text-neutral-900">페이지를 찾을 수 없어요.</h1>
        <p className="mt-1 text-sm text-neutral-400">주소를 다시 확인해주세요.</p>
      </div>
      <Link to="/">
        <Button>발견으로 이동</Button>
      </Link>
    </div>
  )
}
