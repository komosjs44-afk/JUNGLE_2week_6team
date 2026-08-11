-- ============================================================
-- RE:FRAME — 좋아요 · 댓글 · 알림
-- 사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. (여러 번 실행 안전)
-- references.like_count / comment_count 컬럼은 이미 있음 → 트리거로 자동 유지.
-- 주의: references 는 예약어라 큰따옴표 필요.
-- ============================================================

-- ------------------------------------------------------------
-- 알림 테이블 + 생성 헬퍼 (트리거가 이걸 통해 알림을 남긴다)
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,  -- 알림 받는 사람
  actor_id     uuid not null references public.profiles (id) on delete cascade,  -- 행동한 사람
  type         text not null check (type in ('follow', 'like', 'comment')),
  reference_id uuid references public."references" (id) on delete cascade,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists notif_recipient_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select using (auth.uid() = recipient_id);
drop policy if exists notif_update on public.notifications;   -- 읽음 처리
create policy notif_update on public.notifications for update using (auth.uid() = recipient_id);

-- 본인에게는 알림 안 보냄. security definer 라 트리거가 RLS 우회해 삽입 가능.
create or replace function public.create_notification(p_recipient uuid, p_actor uuid, p_type text, p_reference uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null or p_recipient = p_actor then return; end if;
  insert into public.notifications (recipient_id, actor_id, type, reference_id)
  values (p_recipient, p_actor, p_type, p_reference);
end; $$;

-- ------------------------------------------------------------
-- 좋아요
-- ------------------------------------------------------------
create table if not exists public.likes (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  reference_id uuid not null references public."references" (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, reference_id)      -- 중복 좋아요 방지
);
alter table public.likes enable row level security;
drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes for select using (true);
drop policy if exists likes_write on public.likes;
create policy likes_write on public.likes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- like_count 자동 유지 + 좋아요 알림
create or replace function public.sync_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  if (tg_op = 'INSERT') then
    update public."references" set like_count = like_count + 1
      where id = new.reference_id returning user_id into owner_id;
    perform public.create_notification(owner_id, new.user_id, 'like', new.reference_id);
  elsif (tg_op = 'DELETE') then
    update public."references" set like_count = greatest(0, like_count - 1)
      where id = old.reference_id;
  end if;
  return null;
end; $$;
drop trigger if exists likes_sync_trg on public.likes;
create trigger likes_sync_trg after insert or delete on public.likes
  for each row execute function public.sync_like();

-- ------------------------------------------------------------
-- 댓글
-- ------------------------------------------------------------
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  reference_id uuid not null references public."references" (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now()
);
create index if not exists comments_ref_idx on public.comments (reference_id, created_at);
alter table public.comments enable row level security;
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (auth.uid() = user_id);

-- comment_count 자동 유지 + 댓글 알림
create or replace function public.sync_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  if (tg_op = 'INSERT') then
    update public."references" set comment_count = comment_count + 1
      where id = new.reference_id returning user_id into owner_id;
    perform public.create_notification(owner_id, new.user_id, 'comment', new.reference_id);
  elsif (tg_op = 'DELETE') then
    update public."references" set comment_count = greatest(0, comment_count - 1)
      where id = old.reference_id;
  end if;
  return null;
end; $$;
drop trigger if exists comments_sync_trg on public.comments;
create trigger comments_sync_trg after insert or delete on public.comments
  for each row execute function public.sync_comment();

-- ------------------------------------------------------------
-- 팔로우 → 알림 (follows 테이블은 supabase-follows.sql 에서 생성)
-- ------------------------------------------------------------
create or replace function public.on_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.create_notification(new.following_id, new.follower_id, 'follow', null);
  return null;
end; $$;
drop trigger if exists follows_notify_trg on public.follows;
create trigger follows_notify_trg after insert on public.follows
  for each row execute function public.on_follow();

-- ============================================================
-- 프론트 사용 예 (팀원용 메모)
--   좋아요:   supabase.from('likes').insert({ user_id: me, reference_id })
--   취소:     supabase.from('likes').delete().match({ user_id: me, reference_id })
--   내가 좋아요?: supabase.from('likes').select('reference_id').eq('user_id', me)
--   댓글 목록: supabase.from('comments')
--               .select('*, author:profiles!user_id(nickname, avatar_url)')
--               .eq('reference_id', id).order('created_at')
--   댓글 작성: supabase.from('comments').insert({ reference_id, user_id: me, body })
--   알림:     supabase.from('notifications').select('*, actor:profiles!actor_id(*)')
--               .order('created_at', { ascending:false })
--   읽음:     supabase.from('notifications').update({ read:true }).eq('id', notifId)
-- (like_count / comment_count 는 트리거가 자동으로 맞춰줌 — 직접 안 건드림)
-- ============================================================
