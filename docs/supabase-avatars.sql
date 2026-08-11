-- ============================================================
-- RE:FRAME — 계정 관리: 프로필 사진(아바타) Storage
-- 사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
-- 참고: 닉네임/소개/웹사이트 수정은 이미 profiles + RLS(profiles_update)로 동작.
--       여기선 프로필 사진용 버킷 + 정책만 추가한다.
-- ============================================================

-- avatars 버킷 생성 (Public) — Storage UI 대신 SQL로 한 번에
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 정책: 조회는 누구나, 업로드는 로그인 사용자, 수정/삭제는 본인이 올린 것만
drop policy if exists "avatar read" on storage.objects;
create policy "avatar read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatar upload" on storage.objects;
create policy "avatar upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatar update own" on storage.objects;
create policy "avatar update own" on storage.objects
  for update to authenticated using (owner = auth.uid());

drop policy if exists "avatar delete own" on storage.objects;
create policy "avatar delete own" on storage.objects
  for delete to authenticated using (owner = auth.uid());

-- ============================================================
-- 프론트 사용 예 (팀원용 메모)
--   1) 아바타 업로드:
--      supabase.storage.from('avatars').upload(`${userId}/${uuid}.jpg`, file)
--   2) public URL 얻기:
--      supabase.storage.from('avatars').getPublicUrl(path)
--   3) 프로필에 반영 (profiles.avatar_url 컬럼은 이미 있음, RLS로 본인만 수정):
--      supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
-- ============================================================
