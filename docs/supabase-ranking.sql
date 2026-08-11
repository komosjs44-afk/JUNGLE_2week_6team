-- ============================================================
-- RE:FRAME — 랭킹 RPC (실제 데이터 기준)
-- 사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run.
-- 스팟을 "총 좋아요수 / 레퍼런스수 / 최신순" 으로 정렬해 상위 10개 반환.
-- 프론트는 supabase.rpc('ranking_entries', { tab }) 로 호출.
-- 사전조건: supabase-reference-count.sql 실행됨(spots.reference_count 존재).
-- ============================================================

create or replace function public.ranking_entries(tab text default 'top10')
returns table (
  spot_id          uuid,
  name             text,
  address          text,
  image_url        text,
  latitude         double precision,
  longitude        double precision,
  tags             text[],
  recommended_time text,
  created_at       timestamptz,
  reference_count  int,
  total_likes      bigint
)
language sql stable as $$
  select
    s.id, s.name, s.address, s.image_url, s.latitude, s.longitude,
    s.tags, s.recommended_time, s.created_at, s.reference_count,
    coalesce(sum(r.like_count), 0)::bigint as total_likes
  from public.spots s
  left join public."references" r on r.spot_id = s.id
  group by s.id
  order by
    case when tab = 'new'    then s.created_at end desc nulls last,   -- 신규: 최신순
    case when tab = 'rising' then s.reference_count end desc nulls last, -- 급상승: 레퍼런스 많은 순
    coalesce(sum(r.like_count), 0) desc,                              -- top10(기본): 좋아요순
    s.reference_count desc
  limit 10;
$$;

-- ============================================================
-- 확인:  select * from public.ranking_entries('top10');
-- 프론트: supabase.rpc('ranking_entries', { tab: 'top10' | 'rising' | 'new' })
-- ============================================================
