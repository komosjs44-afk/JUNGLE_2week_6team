import { useNavigate, useLocation } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useMemberGateStore } from '@/stores'
import { Modal } from './Modal'
import { Button } from './Button'

/**
 * 게스트/비로그인 사용자가 회원 전용 동작(저장·업로드 등)을 시도했을 때 뜨는 안내 모달.
 * App 최상단에 한 번만 마운트해두면 useMemberGateStore().requireMember() 호출만으로 어디서든 뜬다.
 */
export function MemberGateModal() {
  const open = useMemberGateStore((s) => s.open)
  const close = useMemberGateStore((s) => s.close)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Modal open={open} onClose={close}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <LogIn size={22} />
        </span>
        <div>
          <p className="text-base font-bold text-neutral-900">로그인이 필요해요</p>
          <p className="mt-1 text-sm text-neutral-400">이 기능은 회원만 사용할 수 있어요.</p>
        </div>
        <div className="mt-2 flex w-full gap-2">
          <Button variant="secondary" fullWidth onClick={close}>
            닫기
          </Button>
          <Button
            fullWidth
            onClick={() => {
              close()
              navigate('/login', { state: { from: location } })
            }}
          >
            로그인하러 가기
          </Button>
        </div>
      </div>
    </Modal>
  )
}
