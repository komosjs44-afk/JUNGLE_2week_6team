-- ============================================================
-- RE:FRAME — 더미/테스트 데이터 전체 삭제 (클린 슬레이트)
-- 사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
-- ⚠️ 앱의 모든 콘텐츠(스팟·레퍼런스·좋아요·댓글·알림·저장·업로드기록)와
--    테스트 계정을 지웁니다. 스키마·정책·함수·트리거는 그대로 유지.
--    실제 사용자가 새로 채우면 됩니다. (되돌릴 수 없음)
-- ============================================================

-- 1) 앱 데이터 전체 비우기 (FK는 cascade 로 함께 정리)
truncate table
  public.notifications,
  public.comments,
  public.likes,
  public.saved_references,
  public.saved_spots,
  public.edit_results,
  public.user_photos,
  public.follows,
  public."references",
  public.spots
  restart identity cascade;

-- 2) 테스트 계정 삭제 (profiles 는 on delete cascade 로 함께 삭제)
delete from auth.users
where email in ('reshot-test@example.com', 'reshot-test2@example.com');

-- ============================================================
-- 참고: Storage(reference-images / user-photos / avatars)에 올라간
--       테스트 이미지 파일은 SQL로 안 지워집니다.
--       필요하면 대시보드 Storage 에서 각 버킷을 비우세요.
-- ============================================================
