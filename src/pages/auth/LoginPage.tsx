import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useAuthStore, useGuestStore } from '@/stores'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError } = useAuthStore()
  const guestNickname = useGuestStore((s) => s.nickname)
  const setGuestNickname = useGuestStore((s) => s.setNickname)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  // 게스트 진입 단계: 닫힘 → 닉네임 최초 설정 → 체험모드 안내(닉네임 설정 직후 1회만)
  const [guestStep, setGuestStep] = useState<'closed' | 'nickname' | 'intro'>('closed')
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameError, setNicknameError] = useState<string | null>(null)

  const navState = location.state as { from?: { pathname: string }; reason?: 'member' } | null
  const from = navState?.from?.pathname ?? '/'
  const isMemberOnlyRedirect = navState?.reason === 'member'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()

    const errors: typeof fieldErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = '올바른 이메일 형식이 아니에요.'
    if (password.length < 6) errors.password = '비밀번호는 6자 이상이어야 해요.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch {
      // error is surfaced via store
    }
  }

  function handleGuestEntry() {
    // 이미 닉네임을 정한 적 있으면(재접속) 바로 입장 — 다시 물어보지 않는다.
    if (guestNickname) {
      navigate(from, { replace: true })
      return
    }
    setGuestStep('nickname')
  }

  function handleConfirmNickname(e: FormEvent) {
    e.preventDefault()
    const trimmed = nicknameInput.trim()
    if (!trimmed) {
      setNicknameError('닉네임을 입력해주세요.')
      return
    }
    setGuestNickname(trimmed)
    setGuestStep('intro') // 최초 설정 직후에만 체험모드 안내를 보여준다
  }

  function handleStartExploring() {
    setGuestStep('closed')
    navigate(from, { replace: true })
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm text-neutral-400">마음에 든 사진을, 직접 다시 찍다.</p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">RE:FRAME</h1>
      </div>

      {isMemberOnlyRedirect && (
        <p className="mb-4 rounded-xl bg-primary-50 px-4 py-3 text-center text-sm font-medium text-primary-700">
          이 기능은 로그인이 필요해요.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="이메일"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
        />
        <Input
          label="비밀번호"
          type="password"
          placeholder="6자 이상 입력해주세요"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          autoComplete="current-password"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" fullWidth loading={isLoading} className="mt-2">
          로그인
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-neutral-300">
        <span className="h-px flex-1 bg-neutral-100" />
        또는
        <span className="h-px flex-1 bg-neutral-100" />
      </div>

      <Button variant="secondary" size="lg" fullWidth icon={<Compass size={18} />} onClick={handleGuestEntry}>
        게스트로 둘러보기
      </Button>

      <p className="mt-6 text-center text-sm text-neutral-400">
        아직 계정이 없으신가요?{' '}
        <Link to="/signup" className="font-medium text-primary-600">
          회원가입
        </Link>
      </p>

      {/* 게스트 최초 닉네임 설정 */}
      <Modal open={guestStep === 'nickname'} onClose={() => setGuestStep('closed')}>
        <form onSubmit={handleConfirmNickname} className="flex flex-col gap-4">
          <div>
            <p className="text-base font-bold text-neutral-900">닉네임을 정해주세요</p>
            <p className="mt-1 text-sm text-neutral-400">
              게스트로 둘러볼 때 댓글에 표시될 이름이에요. 한 번 정하면 바꿀 수 없어요.
            </p>
          </div>
          <Input
            placeholder="닉네임 (최대 20자)"
            value={nicknameInput}
            maxLength={20}
            autoFocus
            onChange={(e) => {
              setNicknameInput(e.target.value)
              setNicknameError(null)
            }}
            error={nicknameError ?? undefined}
          />
          <Button type="submit" fullWidth>
            다음
          </Button>
        </form>
      </Modal>

      {/* 체험모드 최초 안내 (닉네임 설정 직후 1회) */}
      <Modal open={guestStep === 'intro'}>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Compass size={22} />
          </span>
          <div>
            <p className="text-base font-bold text-neutral-900">체험 모드로 입장했어요</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              다른 사용자들의 사진과 촬영 정보를 자유롭게 둘러볼 수 있어요.
              <br />
              사진을 확인한 후 후기나 개선 의견을 댓글로 남겨주세요.
            </p>
          </div>
          <Button fullWidth onClick={handleStartExploring} className="mt-2">
            둘러보기 시작
          </Button>
        </div>
      </Modal>
    </div>
  )
}
