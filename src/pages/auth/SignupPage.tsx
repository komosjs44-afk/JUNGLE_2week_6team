import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { PageHeader } from '@/components/layout/PageHeader'

export function SignupPage() {
  const navigate = useNavigate()
  const { signup, isLoading, error, clearError } = useAuthStore()

  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    clearError()

    const errors: Record<string, string> = {}
    if (nickname.trim().length < 2) errors.nickname = '닉네임은 2자 이상이어야 해요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = '올바른 이메일 형식이 아니에요.'
    if (password.length < 6) errors.password = '비밀번호는 6자 이상이어야 해요.'
    if (confirmPassword !== password) errors.confirmPassword = '비밀번호가 일치하지 않아요.'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      await signup(nickname, email, password)
      navigate('/', { replace: true })
    } catch {
      // error is surfaced via store
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="회원가입" />
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-6 py-6">
        <Input
          label="닉네임"
          placeholder="사용할 닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          error={fieldErrors.nickname}
        />
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
          autoComplete="new-password"
        />
        <Input
          label="비밀번호 확인"
          type="password"
          placeholder="비밀번호를 한 번 더 입력해주세요"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          autoComplete="new-password"
        />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" size="lg" fullWidth loading={isLoading} className="mt-2">
          회원가입
        </Button>
      </form>

      <p className="pb-8 text-center text-sm text-neutral-400">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="font-medium text-primary-600">
          로그인
        </Link>
      </p>
    </div>
  )
}
