import { useEffect } from 'react'
import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { useAuthStore } from '@/stores'

function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

export default App
