import { useEffect } from 'react'
import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { useAuthStore, useSaveStore } from '@/stores'
import { MemberGateModal } from '@/components/common/MemberGateModal'

function App() {
  const init = useAuthStore((s) => s.init)
  const user = useAuthStore((s) => s.user)
  const loadSaves = useSaveStore((s) => s.load)
  const clearSaves = useSaveStore((s) => s.clear)

  // 앱 시작 시 세션 복원
  useEffect(() => {
    void init()
  }, [init])

  // 로그인 사용자가 바뀌면 저장 목록 동기화
  useEffect(() => {
    if (user) void loadSaves()
    else clearSaves()
  }, [user, loadSaves, clearSaves])

  return (
    <AppProviders>
      <AppRouter />
      <MemberGateModal />
    </AppProviders>
  )
}

export default App
