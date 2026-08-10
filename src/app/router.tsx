import { Routes, Route } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { MapPage } from '@/pages/MapPage'
import { SpotDetailPage } from '@/pages/SpotDetailPage'
import { ReferenceDetailPage } from '@/pages/ReferenceDetailPage'
import { RecreatePage } from '@/pages/RecreatePage'
import { UploadPage } from '@/pages/UploadPage'
import { UploadExifPage } from '@/pages/UploadExifPage'
import { UploadLocationPage } from '@/pages/UploadLocationPage'
import { UploadInfoPage } from '@/pages/UploadInfoPage'
import { UploadCompletePage } from '@/pages/UploadCompletePage'
import { RankingPage } from '@/pages/RankingPage'
import { RoutePage } from '@/pages/RoutePage'
import { MyPage } from '@/pages/MyPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SearchPage } from '@/pages/SearchPage'
import { AiAdjustPage } from '@/pages/AiAdjustPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route
        element={
          <RequireAuth>
            <RootLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/spots/:spotId" element={<SpotDetailPage />} />
        <Route path="/references/:referenceId" element={<ReferenceDetailPage />} />
        <Route path="/references/:referenceId/recreate" element={<RecreatePage />} />

        <Route path="/upload" element={<UploadPage />} />
        <Route path="/upload/exif" element={<UploadExifPage />} />
        <Route path="/upload/location" element={<UploadLocationPage />} />
        <Route path="/upload/info" element={<UploadInfoPage />} />
        <Route path="/upload/complete" element={<UploadCompletePage />} />

        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/route" element={<RoutePage />} />
        <Route path="/my" element={<MyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/ai-adjust" element={<AiAdjustPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
