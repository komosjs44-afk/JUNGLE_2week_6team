-- ============================================================
-- RE:FRAME — 게스트 체험모드용 댓글(방명록) 확장
-- 사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run. (여러 번 실행 안전)
--
-- 기존 comments 테이블(supabase-social.sql)은 로그인 회원(user_id not null)만
-- 작성 가능했다. 게스트(비로그인 + 닉네임만 가진 사용자)도 댓글을 남길 수 있게
-- user_id를 nullable로 풀고, 게스트 닉네임을 담을 guest_nickname 컬럼을 추가한다.
--   - 회원 댓글: user_id = 회원 id,       guest_nickname = null (작성자 이름은 profiles.nickname)
--   - 게스트 댓글: user_id = null,         guest_nickname = 게스트가 정한 닉네임
-- ============================================================

alter table public.comments alter column user_id drop not null;
alter table public.comments add column if not exists guest_nickname text;

-- 회원이면 user_id, 게스트면 guest_nickname(1~20자) 둘 중 하나는 반드시 있어야 함
alter table public.comments drop constraint if exists comments_author_check;
alter table public.comments add constraint comments_author_check check (
  user_id is not null
  or (guest_nickname is not null and char_length(guest_nickname) between 1 and 20)
);

-- 회원(auth.uid()=user_id) 또는 게스트(user_id 없이 닉네임만 채워서)가 쓸 수 있게 INSERT 정책 교체
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (
  auth.uid() = user_id
  or (user_id is null and guest_nickname is not null and char_length(guest_nickname) between 1 and 20)
);
-- select/delete 정책은 그대로 유지 (delete는 계속 회원 본인 것만 — 게스트 댓글은 삭제 API 없음)

-- 댓글 알림 트리거: 게스트 댓글(user_id null)은 신고할 작성자 프로필이 없으므로 알림을 건너뛴다.
-- (notifications.actor_id가 not null이라, 그대로 두면 게스트 댓글 작성 시 트리거가 실패해서 댓글 자체가 막힘)
create or replace function public.sync_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_id uuid;
begin
  if (tg_op = 'INSERT') then
    update public."references" set comment_count = comment_count + 1
      where id = new.reference_id returning user_id into owner_id;
    if new.user_id is not null then
      perform public.create_notification(owner_id, new.user_id, 'comment', new.reference_id);
    end if;
  elsif (tg_op = 'DELETE') then
    update public."references" set comment_count = greatest(0, comment_count - 1)
      where id = old.reference_id;
  end if;
  return null;
end; $$;

-- ============================================================
-- 프론트 사용 예 (팀원용 메모)
--   댓글 목록: supabase.from('comments')
--               .select('*, author:profiles!user_id(nickname, avatar_url)')
--               .eq('reference_id', id).order('created_at')
--             → 회원 댓글은 author 조인 결과 사용, 게스트 댓글은 author가 null이라 guest_nickname 사용
--   회원 작성: supabase.from('comments').insert({ reference_id, user_id: me, body })
--   게스트 작성(로그인 세션 없이 anon key로 호출):
--               supabase.from('comments').insert({ reference_id, guest_nickname: nickname, body })
-- ============================================================
