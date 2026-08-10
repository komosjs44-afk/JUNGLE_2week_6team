-- ============================================================
-- RE:SHOT — Supabase 스키마
-- 사용법: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run.
-- 위에서 아래 순서대로 한 번에 실행하면 됩니다 (여러 번 실행해도 안전).
-- 프론트 타입(src/types/*.ts)에 1:1로 맞춰져 있음.
--   DB는 snake_case(예: image_url), 프론트는 camelCase(imageUrl).
--   이 변환은 프론트 repository 레이어에서 처리하므로 DB는 snake_case로 둡니다.
-- ============================================================

-- 1) 프로필 (Supabase Auth의 auth.users 와 1:1) -----------------
-- 회원가입은 Supabase Auth가 처리하고, 여기엔 부가 정보만 저장.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null,
  email      text,
  avatar_url text,
  bio        text,
  website    text,
  created_at timestamptz not null default now()
);

-- 2) 스팟 --------------------------------------------------------
create table if not exists public.spots (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  address          text not null,
  description      text,
  image_url        text not null,
  latitude         double precision not null,
  longitude        double precision not null,
  tags             text[] not null default '{}',
  recommended_time text,
  created_at       timestamptz not null default now()
);

-- 3) 레퍼런스 사진 (spots 1 : N references) ----------------------
-- 주의: references 는 Postgres 예약어라 큰따옴표로 감싸야 함.
create table if not exists public."references" (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  spot_id       uuid not null references public.spots (id) on delete cascade,
  title         text not null,
  image_url     text not null,
  tags          text[] not null default '{}',
  shot_at       timestamptz,
  direction     double precision,   -- 촬영 방향(도)
  focal_length  double precision,
  creator_tip   text,
  exif          jsonb,              -- ExifData 통째로 저장
  adjustment    jsonb,              -- AdjustmentRecipe 통째로 저장
  like_count    integer not null default 0,
  comment_count integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists references_spot_id_idx on public."references" (spot_id);
create index if not exists references_user_id_idx on public."references" (user_id);

-- 4) 저장 기능 (사용자가 스팟/레퍼런스 저장) ---------------------
create table if not exists public.saved_spots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  spot_id    uuid not null references public.spots (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, spot_id)            -- 중복 저장 방지
);

create table if not exists public.saved_references (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  reference_id uuid not null references public."references" (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, reference_id)
);

-- 5) (나중에·AI 담당용) 사용자 촬영 사진 & 보정 결과 -------------
-- MVP 단계에선 안 써도 됨. 구조만 미리 잡아둠.
create table if not exists public.user_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  spot_id      uuid references public.spots (id) on delete set null,
  reference_id uuid references public."references" (id) on delete set null,
  image_url    text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.edit_results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  user_photo_id uuid references public.user_photos (id) on delete cascade,
  reference_id  uuid references public."references" (id) on delete set null,
  original_url  text,
  result_url    text,
  analysis      jsonb,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 회원가입 시 profiles 자동 생성 트리거
-- Auth로 가입하면 auth.users에 행이 생기는데, 거기에 맞춰 profiles도 자동 생성.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS (Row Level Security) — 이거 안 하면 데이터가 안 나오거나 다 뚫림!
-- 규칙: 공개 콘텐츠(spots/references/profiles)는 누구나 읽기,
--       쓰기·저장은 로그인한 본인만.
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.spots           enable row level security;
alter table public."references"    enable row level security;
alter table public.saved_spots     enable row level security;
alter table public.saved_references enable row level security;
alter table public.user_photos     enable row level security;
alter table public.edit_results    enable row level security;

-- profiles: 누구나 조회, 본인만 수정
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (auth.uid() = id);

-- spots: 누구나 조회, 로그인 사용자면 등록 가능
drop policy if exists spots_select on public.spots;
create policy spots_select on public.spots for select using (true);
drop policy if exists spots_insert on public.spots;
create policy spots_insert on public.spots for insert with check (auth.uid() is not null);

-- references: 누구나 조회, 본인 것만 생성/수정/삭제
drop policy if exists references_select on public."references";
create policy references_select on public."references" for select using (true);
drop policy if exists references_insert on public."references";
create policy references_insert on public."references" for insert with check (auth.uid() = user_id);
drop policy if exists references_modify on public."references";
create policy references_modify on public."references" for update using (auth.uid() = user_id);
drop policy if exists references_delete on public."references";
create policy references_delete on public."references" for delete using (auth.uid() = user_id);

-- saved_spots / saved_references: 본인 것만 조회·추가·삭제
drop policy if exists saved_spots_all on public.saved_spots;
create policy saved_spots_all on public.saved_spots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists saved_references_all on public.saved_references;
create policy saved_references_all on public.saved_references
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_photos / edit_results: 본인 것만 (전체)
drop policy if exists user_photos_all on public.user_photos;
create policy user_photos_all on public.user_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists edit_results_all on public.edit_results;
create policy edit_results_all on public.edit_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 테스트용 샘플 스팟 3개 (프론트 첫 연결 확인용)
-- ============================================================
insert into public.spots (name, address, description, image_url, latitude, longitude, tags, recommended_time)
values
  ('남산타워 전망대', '서울 용산구 남산공원길 105', '서울 야경 명소', 'https://picsum.photos/seed/spot1/800/600', 37.5512, 126.9882, array['야경','전망'], '일몰 후'),
  ('한강 반포대교', '서울 서초구 신반포로11길 40', '무지개분수와 노을', 'https://picsum.photos/seed/spot2/800/600', 37.5133, 126.9958, array['노을','강'], '해질녘'),
  ('북촌한옥마을', '서울 종로구 계동길 37', '전통 한옥 골목', 'https://picsum.photos/seed/spot3/800/600', 37.5826, 126.9850, array['한옥','골목'], '오전')
on conflict do nothing;
