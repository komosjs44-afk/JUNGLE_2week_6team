-- ============================================================
-- RE:FRAME — 태그(인기 태그) + 지도/태그 검색
-- 사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. (여러 번 실행 안전)
-- 태그 저장은 이미 references.tags / spots.tags (text[]) 로 됨. 여긴 조회/검색용.
-- ============================================================

-- 검색 속도용 GIN 인덱스 (배열 포함 연산 @>, && 가속)
create index if not exists refs_tags_gin  on public.references using gin (tags);
create index if not exists spots_tags_gin on public.spots      using gin (tags);

-- ------------------------------------------------------------
-- 5) 인기 태그 — 많이 쓰인 순 (입력칸 아래 추천 칩용)
-- ------------------------------------------------------------
create or replace function public.popular_tags(limit_count int default 10)
returns table (tag text, uses bigint)
language sql stable as $$
  select t.tag, count(*) as uses
  from public.references, unnest(tags) as t(tag)
  where t.tag <> ''
  group by t.tag
  order by uses desc, t.tag
  limit limit_count;
$$;

-- ------------------------------------------------------------
-- 6) 저장된 전체 태그 목록 (필터 칩으로 뿌릴 때)
-- ------------------------------------------------------------
create or replace function public.all_tags()
returns table (tag text)
language sql stable as $$
  select distinct tag from (
    select unnest(tags) as tag from public.spots
    union all
    select unnest(tags)        from public.references
  ) x
  where tag <> ''
  order by tag;
$$;

-- 태그로 스팟 검색 (하나라도 포함: 배열 교집합 &&)
create or replace function public.spots_by_tags(tags text[])
returns setof public.spots
language sql stable as $$
  select * from public.spots
  where cardinality($1) = 0 or tags && $1
  order by created_at desc;
$$;

-- 태그로 레퍼런스 검색 (조인 없이 원본 행만 — 프론트에서 상세 조회)
create or replace function public.references_by_tags(tags text[])
returns setof public.references
language sql stable as $$
  select * from public.references
  where cardinality($1) = 0 or tags && $1
  order by like_count desc;
$$;

-- ============================================================
-- 프론트 사용 예 (팀원용 메모)
--   인기 태그:   supabase.rpc('popular_tags', { limit_count: 8 })
--   전체 태그:   supabase.rpc('all_tags')
--   스팟 검색:   supabase.rpc('spots_by_tags', { tags: ['노을','골목'] })
--   레퍼 검색:   supabase.rpc('references_by_tags', { tags: ['야경'] })
-- ============================================================
