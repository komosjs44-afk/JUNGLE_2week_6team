import { useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Button } from '@/components/common/Button'

/**
 * 게스트가 회원 전용 페이지로 들어오려 할 때 로그인 화면으로 곧장 튕기지 않고 한 번 보여주는
 * 안내 페이지 (RequireAuth 가 user 가 없을 때 렌더). 여기서 로그인/회원가입/넘어가기를 고른다.
 * 현재 location 을 그대로 from 으로 넘겨서, 로그인 후 원래 가려던 페이지로 돌아온다.
 */
export function LoginRequiredPage() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <LogIn size={28} />
      </span>

      <h1 className="text-lg font-bold text-neutral-900">이 기능은 로그인이 필요합니다</h1>
      <p className="mt-2 text-sm text-neutral-500">로그인 하시겠습니까?</p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
        <Button
          size="lg"
          fullWidth
          onClick={() => navigate('/login', { state: { from: location, reason: 'member' } })}
        >
          로그인
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => navigate('/signup', { state: { from: location } })}
        >
          회원가입
        </Button>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="mt-2 min-h-[44px] text-sm font-medium text-neutral-400"
        >
          넘어가기
        </button>
      </div>
    </div>
  )
}
