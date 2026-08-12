-- ============================================================
-- RE:FRAME — 이벤트/챌린지 + 나뭇잎 리워드 스키마
-- Supabase SQL Editor에 붙여넣고 Run. 여러 번 실행해도 안전(idempotent).
--
-- 기존 규칙 준수:
--   * 사용자 FK는 public.profiles(id) 참조 (auth.users 직접 참조 아님)
--   * references 는 예약어라 큰따옴표 필수: public."references"
--   * snake_case 컬럼, RLS 정책은 drop policy if exists 후 create
--   * 카운터는 트리거로 비정규화, 언더플로는 greatest(0, ...)
--
-- 이 SQL 실행 후, 프론트를 실서버로 전환하려면:
--   src/services/events.ts, src/services/leaves.ts 의 import를
--   mock* → supabase* 로 한 줄씩 바꾼다.
-- ============================================================

-- ---------- 테이블 ----------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'WEEKLY' check (type in ('DAILY', 'WEEKLY', 'SPECIAL')),
  label text not null,
  title text not null,
  description text not null default '',
  submission_start_at timestamptz not null,
  submission_end_at timestamptz not null,
  voting_start_at timestamptz not null,
  voting_end_at timestamptz not null,
  result_at timestamptz not null,
  rewards jsonb not null default '[]'::jsonb, -- [{"rank":1,"leaves":20}, ...]
  votes_per_user int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.event_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reference_id uuid not null references public."references"(id) on delete cascade,
  vote_count int not null default 0, -- 비정규화(트리거로 동기화)
  created_at timestamptz not null default now(),
  unique (event_id, user_id) -- 이벤트당 1회 참여
);

create table if not exists public.event_votes (
  event_id uuid not null references public.events(id) on delete cascade,
  entry_id uuid not null references public.event_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id) -- 동일 작품 중복 투표 방지
);

-- 나뭇잎 원장(append-only). 잔액은 sum(amount)로 계산.
create table if not exists public.leaf_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null, -- 부호 있는 정수(적립 +)
  reason text not null,
  source_type text not null,
  source_id text,
  label text not null default '',
  created_at timestamptz not null default now()
);

-- 중복 지급 방지: 같은 (user, reason, source_type, source_id) 조합은 1건만.
create unique index if not exists leaf_tx_dedup
  on public.leaf_transactions (user_id, reason, source_type, coalesce(source_id, ''));

-- ---------- 투표수 비정규화 트리거 ----------

create or replace function public.sync_entry_vote_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.event_entries set vote_count = vote_count + 1 where id = new.entry_id;
  elsif (tg_op = 'DELETE') then
    update public.event_entries set vote_count = greatest(0, vote_count - 1) where id = old.entry_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_sync_entry_vote_count on public.event_votes;
create trigger trg_sync_entry_vote_count
  after insert or delete on public.event_votes
  for each row execute function public.sync_entry_vote_count();

-- 자기 작품 투표 금지(DB 레벨 보강 — 앱에서도 막지만 이중 방어).
create or replace function public.prevent_self_vote()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.event_entries e where e.id = new.entry_id and e.user_id = new.user_id) then
    raise exception '자신의 작품에는 투표할 수 없어요.';
  end if;
  return new;
end; $$;

drop trigger if exists trg_prevent_self_vote on public.event_votes;
create trigger trg_prevent_self_vote
  before insert on public.event_votes
  for each row execute function public.prevent_self_vote();

-- ---------- 나뭇잎 적립 함수(idempotent) ----------
-- 클라이언트가 leaf_transactions 에 직접 insert 하지 못하게 막고(아래 RLS),
-- 적립은 이 security definer 함수로만 수행 → 임의 적립/중복 지급 차단.
create or replace function public.award_leaf(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_source_type text,
  p_source_id text,
  p_label text
) returns void language plpgsql security definer as $$
begin
  insert into public.leaf_transactions (user_id, amount, reason, source_type, source_id, label)
  values (p_user_id, p_amount, p_reason, p_source_type, p_source_id, p_label)
  on conflict (user_id, reason, source_type, coalesce(source_id, '')) do nothing;
end; $$;

grant execute on function public.award_leaf(uuid, int, text, text, text, text) to authenticated;

-- ---------- RLS ----------

alter table public.events enable row level security;
alter table public.event_entries enable row level security;
alter table public.event_votes enable row level security;
alter table public.leaf_transactions enable row level security;

-- events: 공개 조회(작성은 운영자가 SQL/대시보드로)
drop policy if exists events_select on public.events;
create policy events_select on public.events for select using (true);

-- event_entries: 공개 조회, 본인만 참여 insert
drop policy if exists entries_select on public.event_entries;
create policy entries_select on public.event_entries for select using (true);
drop policy if exists entries_insert on public.event_entries;
create policy entries_insert on public.event_entries for insert with check (auth.uid() = user_id);

-- event_votes: 본인 것만 조회/삽입 (자기작품·기간 제약은 트리거/앱)
drop policy if exists votes_select on public.event_votes;
create policy votes_select on public.event_votes for select using (auth.uid() = user_id);
drop policy if exists votes_insert on public.event_votes;
create policy votes_insert on public.event_votes for insert with check (auth.uid() = user_id);

-- leaf_transactions: 본인 것만 조회. 직접 insert 정책 없음 → award_leaf 함수로만 적립.
drop policy if exists leaf_select on public.leaf_transactions;
create policy leaf_select on public.leaf_transactions for select using (auth.uid() = user_id);

-- ---------- (선택) 데모용 시드 이벤트 ----------
-- 아래는 예시. 실제 운영에선 원하는 기간/보상으로 insert 하세요.
-- insert into public.events (type, label, title, description,
--   submission_start_at, submission_end_at, voting_start_at, voting_end_at, result_at, rewards, votes_per_user)
-- values ('WEEKLY', '이번 주 챌린지', '서울의 노을', '이번 주 가장 멋진 노을 사진을 보여주세요.',
--   now(), now() + interval '6 days', now() + interval '7 days', now() + interval '8 days', now() + interval '9 days',
--   '[{"rank":1,"leaves":20},{"rank":2,"leaves":10},{"rank":3,"leaves":5}]'::jsonb, 1);
