# RE:FRAME 프론트엔드 연동 가이드 (백엔드 → 프론트)

백엔드(Supabase + AI Edge Function) 작업이 준비됐어요. 프론트에서 아래 계약(테이블·RPC·Storage·Edge Function)대로 호출하면 됩니다.
**픽셀 보정(Canvas)·UI·UX는 프론트, 데이터/인증/AI 판단은 백엔드** 로 나눠져 있어요.

> 먼저 각 SQL을 Supabase SQL Editor에서 Run 해야 아래가 동작해요:
> `supabase-schema.sql` · `supabase-storage-policies.sql` · `supabase-follows.sql` · `supabase-avatars.sql` · `supabase-tags-search.sql`

## 0. 환경변수 (`.env`, 깃 커밋 금지)
```
VITE_SUPABASE_URL=https://cjiofuoszviujypqmpzk.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable 키>
VITE_KAKAO_MAP_KEY=<카카오 JS 키>
```

## 1. 인증 (완료 — Supabase Auth)
```ts
// 회원가입 (닉네임은 트리거가 profiles로 복사)
await supabase.auth.signUp({ email, password, options: { data: { nickname } } })
// 로그인 / 로그아웃 / 현재 세션
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signOut()
const { data } = await supabase.auth.getSession()
```
회원가입 시 `profiles` 행이 자동 생성돼요. 비밀번호는 **6자 이상**.

## 2. 프로필 / 계정
```ts
// 프로필 조회
await supabase.from('profiles').select('*').eq('id', userId).single()
// 프로필 수정 (본인만, RLS) — 닉네임·소개·웹사이트·아바타
await supabase.from('profiles').update({ nickname, bio, website, avatar_url }).eq('id', userId)
```

## 3. 팔로우 (신규)
```ts
// 팔로우 / 언팔로우
await supabase.from('follows').insert({ follower_id: me, following_id: target })
await supabase.from('follows').delete().match({ follower_id: me, following_id: target })
// 팔로워/팔로잉 수
await supabase.rpc('follow_counts', { uid: target })   // → { followers, following }
// 내가 팔로우 중인지 (버튼 상태)
await supabase.rpc('is_following', { target })          // → true / false
```

## 4. 스팟 / 레퍼런스 조회
```ts
// 스팟 목록·상세
await supabase.from('spots').select('*').order('created_at', { ascending: false })
await supabase.from('spots').select('*').eq('id', spotId).single()

// 레퍼런스 목록 (작성자·스팟 조인)
await supabase
  .from('references')
  .select('*, creator:profiles!user_id(*), spot:spots!spot_id(*)')
  .order('like_count', { ascending: false })
```
> DB는 `snake_case`(image_url), 프론트 타입은 `camelCase`(imageUrl) — 매핑은 repository에서.

## 5. 태그 & 검색 (신규)
```ts
// 인기 태그 (입력칸 아래 추천 칩)
await supabase.rpc('popular_tags', { limit_count: 8 })     // → [{ tag, uses }]
// 전체 태그 목록 (필터 칩)
await supabase.rpc('all_tags')                              // → [{ tag }]
// 태그로 스팟/레퍼런스 검색
await supabase.rpc('spots_by_tags', { tags: ['노을','골목'] })
await supabase.rpc('references_by_tags', { tags: ['야경'] })
```
태그 입력은 사용자가 직접 타이핑 → `references.tags`(text[])에 그대로 저장돼요.

## 6. Storage (사진 업로드)
버킷: `reference-images` · `user-photos` · `avatars` · `spot-images` (모두 public)
```ts
// 업로드 (로그인 필요) — 경로는 사용자별로 구분 권장: `${userId}/${uuid}.jpg`
await supabase.storage.from('user-photos').upload(path, file)
// public URL
const { data } = supabase.storage.from('user-photos').getPublicUrl(path)
```
> ⚠️ `crypto.randomUUID()`는 https/localhost에서만 동작 — 폰(http)에선 폴백 함수 사용.

## 7. AI 색감 보정 (Edge Function — 핵심)
서버가 이미지 2장을 Gemini로 분석해 **보정값 JSON**만 반환해요. 키는 서버에만 있음.
```ts
// 요청
const { data, error } = await supabase.functions.invoke('analyze-photo', {
  body: { myPhotoUrl, referenceUrl },
})
// 응답 = AdjustmentRecipe (그대로 Canvas 보정에 적용)
// { exposure, contrast, highlights, shadows, saturation, temperature }
```
**흐름:**
1. 내 사진 Storage 업로드 → `user_photos` insert
2. `analyze-photo(myPhotoUrl, referenceUrl)` 호출 → 보정값 JSON
3. **Canvas로 픽셀 보정 (프론트)** — `applyAdjustment(recipe)`
4. 보정본 Storage 업로드
5. 결과 저장 → `edit_results` insert

## 8. AI 결과 저장 (`edit_results`)
```ts
await supabase.from('edit_results').insert({
  user_id: me,
  user_photo_id: userPhotoId,   // user_photos.id (선택)
  reference_id: referenceId,    // 참고한 레퍼런스 (선택)
  original_url: myPhotoUrl,
  result_url: resultUrl,        // 보정본 URL
  analysis: recipe,             // 적용한 보정값(JSON)
})
```

---

## 역할 경계 요약
| 백엔드(나) | 프론트(팀원) |
|---|---|
| 인증·DB·RLS·Storage 정책 | 이미지 표시·업로드 UI |
| 팔로우/태그/검색 RPC | RPC 호출·목록 렌더 |
| Gemini 분석(analyze-photo) | 보정값 Canvas 적용·미리보기 |
| edit_results 스키마 | 보정 결과 저장 요청 |

계약(테이블·RPC 이름·Edge Function 입출력)만 이대로면 서로 안 부딪혀요. 값·필드 추가 필요하면 말해주세요.
