-- ============================================================
-- RE:FRAME — 스팟별 레퍼런스 개수(reference_count) 실제값
-- 지금은 프론트에서 0으로 고정. spots 에 컬럼을 두고 트리거로 자동 유지한다.
-- 사용법: SQL Editor 에 붙여넣고 Run. (여러 번 실행 안전)
-- ============================================================

-- 1) 컬럼 추가 (이미 있으면 무시)
alter table public.spots add column if not exists reference_count int not null default 0;

-- 2) 기존 데이터 backfill (현재 레퍼런스 수로 채움)
update public.spots s
set reference_count = (
  select count(*) from public."references" r where r.spot_id = s.id
);

-- 3) 레퍼런스 추가/삭제 시 자동 증감
create or replace function public.sync_spot_reference_count() returns trigger
language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.spots set reference_count = reference_count + 1 where id = new.spot_id;
  elsif (tg_op = 'DELETE') then
    update public.spots set reference_count = greatest(0, reference_count - 1) where id = old.spot_id;
  end if;
  return null;
end; $$;

drop trigger if exists refs_spot_count_trg on public."references";
create trigger refs_spot_count_trg after insert or delete on public."references"
  for each row execute function public.sync_spot_reference_count();

-- ============================================================
-- 프론트 메모: 이제 spots.reference_count 를 그대로 읽으면 됨.
--   repository 매핑에서 referenceCount: row.reference_count
-- ============================================================
