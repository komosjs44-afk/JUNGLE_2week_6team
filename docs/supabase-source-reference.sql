-- ============================================================
-- RE:FRAME — 파생 게시물 출처 (source_reference_id)
-- 사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. (여러 번 실행 안전)
--
-- "이 게시물이 다른 사람의 어떤 레퍼런스를 참고해 AI로 재현됐는지" 기록.
--   - null       → 원본 게시물(Original)
--   - 값 있음    → 파생 게시물(Derived), 그 레퍼런스를 보고 만든 것
-- 이게 있어야 상세의 "참고한 레퍼런스" 카드와, 재보정 시 원본 타겟팅이
-- 새로고침 이후에도 유지됨.
-- 주의: references 는 예약어라 큰따옴표 필요.
-- ============================================================

alter table public."references"
  add column if not exists source_reference_id uuid
  references public."references" (id) on delete set null;
  -- on delete set null: 원본 레퍼런스가 삭제되면 이 값만 null 로 (게시물은 유지)

-- 출처로 역참조(이 원본을 보고 만든 파생들) 조회 속도용
create index if not exists refs_source_idx on public."references" (source_reference_id);

-- ============================================================
-- 프론트 사용 예 (팀원용 메모)
--
-- 1) 업로드 시 (다른 레퍼런스 보고 AI 보정한 파생 게시물이면):
--    supabase.from('references').insert({ ..., source_reference_id: 원본레퍼런스id })
--    (원본에서 올린 거면 source_reference_id 생략 → null)
--
-- 2) 상세의 "참고한 레퍼런스" 카드 — 원본을 함께 조인해서 조회:
--    supabase.from('references')
--      .select('*, source:references!source_reference_id(*, creator:profiles!user_id(*))')
--      .eq('id', id).single()
--    → data.source 가 있으면 파생, null 이면 원본.
--
-- 3) "이 원본을 보고 만든 파생들" 목록:
--    supabase.from('references').select('*').eq('source_reference_id', 원본id)
-- ============================================================
