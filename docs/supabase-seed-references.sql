-- ============================================================
-- RE:SHOT — 샘플 레퍼런스 데이터 (프론트 확인용)
-- 사용법: SQL Editor 에 붙여넣고 Run.
-- 조건: profiles 에 사용자가 1명 이상, spots 에 장소가 있어야 함.
--        (가장 먼저 가입한 사용자를 작성자로, 모든 스팟에 레퍼런스 2개씩 생성)
-- 주의: references 는 예약어라 큰따옴표 필요.
-- ============================================================

with author as (
  select id from public.profiles order by created_at asc limit 1
)
insert into public."references"
  (user_id, spot_id, title, image_url, tags, direction, focal_length, creator_tip, like_count, comment_count)
select
  (select id from author),
  s.id,
  s.name || ' ' || t.suffix,
  'https://picsum.photos/seed/' || s.id || '-' || t.n || '/800/1000',
  s.tags,
  (t.n * 90)::double precision,
  (24 + t.n * 11)::double precision,
  t.tip,
  floor(random() * 400)::int,
  floor(random() * 30)::int
from public.spots s
cross join (
  values
    (1, '노을 스냅', '건물을 오른쪽 1/3에 두고 낮은 앵글에서 촬영했어요.'),
    (2, '야경 컷', '해진 직후 20분, 조명이 가장 선명한 시간대를 노려보세요.')
) as t(n, suffix, tip)
where exists (select 1 from author);
