-- ============================================================
-- RE:FRAME — 팔로우(팔로워/팔로잉)
-- 사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. (여러 번 실행해도 안전)
-- ============================================================

-- 관계 테이블: follower_id 가 following_id 를 팔로우
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),   -- 같은 사람 중복 팔로우 방지
  check (follower_id <> following_id)         -- 자기 자신 팔로우 금지
);

-- "이 사람을 팔로우하는 사람들" 조회 속도용
create index if not exists follows_following_idx on public.follows (following_id);

-- RLS: 팔로우 관계는 공개 조회, 팔로우/언팔로우는 본인만
alter table public.follows enable row level security;

drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select using (true);

drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows
  for delete using (auth.uid() = follower_id);

-- ------------------------------------------------------------
-- 편의 함수 (프론트는 supabase.rpc(...) 로 호출)
-- ------------------------------------------------------------

-- 특정 사용자의 팔로워/팔로잉 수를 한 번에
create or replace function public.follow_counts(uid uuid)
returns table (followers bigint, following bigint)
language sql stable as $$
  select
    (select count(*) from public.follows where following_id = uid),
    (select count(*) from public.follows where follower_id  = uid);
$$;

-- 로그인한 내가 target 을 팔로우 중인지 (하트/버튼 상태용)
create or replace function public.is_following(target uuid)
returns boolean
language sql stable as $$
  select exists (
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = target
  );
$$;

-- ============================================================
-- 프론트 사용 예 (팀원용 메모)
--   팔로우:    supabase.from('follows').insert({ follower_id: me, following_id: target })
--   언팔로우:  supabase.from('follows').delete().match({ follower_id: me, following_id: target })
--   카운트:    supabase.rpc('follow_counts', { uid: target })
--   상태:      supabase.rpc('is_following', { target })
-- ============================================================
