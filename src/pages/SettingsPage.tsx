import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input, Textarea } from '@/components/common/Input'
import { Button } from '@/components/common/Button'

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const logout = useAuthStore((s) => s.logout)
  const isLoading = useAuthStore((s) => s.isLoading)

  const [nickname, setNickname] = useState(user?.nickname ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [website, setWebsite] = useState(user?.website ?? '')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    if (nickname.trim().length < 2) {
      setError('닉네임은 2자 이상이어야 해요.')
      return
    }
    try {
      await updateProfile({ nickname: nickname.trim(), bio: bio.trim(), website: website.trim() })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했어요.')
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="계정 설정" />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-4 py-4">
        <Input label="이메일" value={user.email} disabled readOnly />
        <Input
          label="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
        />
        <Textarea
          label="소개"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="한 줄 소개를 적어보세요"
          maxLength={100}
        />
        <Input
          label="웹사이트"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://"
        />

        {error && <p className="text-sm text-danger">{error}</p>}
        {saved && <p className="text-sm text-primary-600">저장했어요.</p>}

        <Button type="submit" size="lg" fullWidth loading={isLoading} className="mt-2">
          저장
        </Button>
      </form>

      <div className="px-4 pt-2 pb-8">
        <Button variant="ghost" fullWidth icon={<LogOut size={16} />} onClick={handleLogout}>
          로그아웃
        </Button>
      </div>
    </div>
  )
}
