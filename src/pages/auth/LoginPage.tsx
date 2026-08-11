import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoading, error, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

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

  return (
    <div className="flex flex-1 flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm text-neutral-400">마음에 든 사진을, 직접 다시 찍다.</p>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">RE:FRAME</h1>
      </div>

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

      <p className="mt-6 text-center text-sm text-neutral-400">
        아직 계정이 없으신가요?{' '}
        <Link to="/signup" className="font-medium text-primary-600">
          회원가입
        </Link>
      </p>
    </div>
  )
}
