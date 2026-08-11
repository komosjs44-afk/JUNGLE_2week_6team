import { Routes, Route } from 'react-router-dom'
import { RootLayout } from '@/components/layout/RootLayout'
import { RequireSession } from '@/components/layout/RequireSession'
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
import { UserProfilePage } from '@/pages/UserProfilePage'
import { FollowListPage } from '@/pages/FollowListPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { SearchPage } from '@/pages/SearchPage'
import { AiAdjustPage } from '@/pages/AiAdjustPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* 로그인 회원 또는 닉네임을 정한 게스트면 통과 — 조회 위주 화면들 */}
      <Route element={<RequireSession />}>
        <Route element={<RootLayout />}>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/spots/:spotId" element={<SpotDetailPage />} />
          <Route path="/references/:referenceId" element={<ReferenceDetailPage />} />
          <Route path="/references/:referenceId/recreate" element={<RecreatePage />} />

          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="/users/:userId" element={<UserProfilePage />} />
          <Route path="/users/:userId/followers" element={<FollowListPage mode="followers" />} />
          <Route path="/users/:userId/following" element={<FollowListPage mode="following" />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/ai-adjust" element={<AiAdjustPage />} />

          {/* 여기부터는 진짜 로그인 회원만 — 게스트가 들어오면 로그인 화면으로 */}
          <Route element={<RequireAuth />}>
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/upload/exif" element={<UploadExifPage />} />
            <Route path="/upload/location" element={<UploadLocationPage />} />
            <Route path="/upload/info" element={<UploadInfoPage />} />
            <Route path="/upload/complete" element={<UploadCompletePage />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
