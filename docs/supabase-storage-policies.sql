-- ============================================================
-- RE:SHOT — Storage 접근 정책
-- 사용법: SQL Editor 에 붙여넣고 Run.
-- 대상 버킷: spot-images, reference-images, user-photos (모두 Public 권장)
-- 규칙: 조회(select)는 누구나, 업로드(insert)는 로그인 사용자만.
-- ============================================================

-- 조회: 세 버킷의 파일은 누구나 읽기 가능
drop policy if exists "storage read (public buckets)" on storage.objects;
create policy "storage read (public buckets)"
  on storage.objects for select
  using (bucket_id in ('spot-images', 'reference-images', 'user-photos'));

-- 업로드: 로그인한 사용자만
drop policy if exists "storage upload (authenticated)" on storage.objects;
create policy "storage upload (authenticated)"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('spot-images', 'reference-images', 'user-photos'));

-- 수정/삭제: 본인이 올린 파일만
drop policy if exists "storage update own" on storage.objects;
create policy "storage update own"
  on storage.objects for update to authenticated
  using (owner = auth.uid());

drop policy if exists "storage delete own" on storage.objects;
create policy "storage delete own"
  on storage.objects for delete to authenticated
  using (owner = auth.uid());
