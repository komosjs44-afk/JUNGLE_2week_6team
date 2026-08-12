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
import { EventDetailPage } from '@/pages/EventDetailPage'
import { EventSubmitPage } from '@/pages/EventSubmitPage'
import { EventVotePage } from '@/pages/EventVotePage'
import { EventResultPage } from '@/pages/EventResultPage'
import { LeafHistoryPage } from '@/pages/LeafHistoryPage'
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

      {/* 로그인 회원 또는 닉네임을 정한 게스트면 통과 */}
      <Route element={<RequireSession />}>
        <Route element={<RootLayout />}>
          {/* 게스트도 볼 수 있는 영역은 "사진 피드" 뿐 — 발견 피드 + 사진 상세(방명록 댓글) */}
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/references/:referenceId" element={<ReferenceDetailPage />} />

          {/* 그 외 전부 회원 전용 — 게스트/비로그인이 들어오면 로그인 화면으로 */}
          <Route element={<RequireAuth />}>
            <Route path="/map" element={<MapPage />} />
            <Route path="/spots/:spotId" element={<SpotDetailPage />} />
            <Route path="/references/:referenceId/recreate" element={<RecreatePage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/route" element={<RoutePage />} />
            <Route path="/events/:eventId" element={<EventDetailPage />} />
            <Route path="/events/:eventId/submit" element={<EventSubmitPage />} />
            <Route path="/events/:eventId/vote" element={<EventVotePage />} />
            <Route path="/events/:eventId/result" element={<EventResultPage />} />
            <Route path="/users/:userId" element={<UserProfilePage />} />
            <Route path="/users/:userId/followers" element={<FollowListPage mode="followers" />} />
            <Route path="/users/:userId/following" element={<FollowListPage mode="following" />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/ai-adjust" element={<AiAdjustPage />} />

            <Route path="/upload" element={<UploadPage />} />
            <Route path="/upload/exif" element={<UploadExifPage />} />
            <Route path="/upload/location" element={<UploadLocationPage />} />
            <Route path="/upload/info" element={<UploadInfoPage />} />
            <Route path="/upload/complete" element={<UploadCompletePage />} />
            <Route path="/my" element={<MyPage />} />
            <Route path="/my/leaves" element={<LeafHistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
