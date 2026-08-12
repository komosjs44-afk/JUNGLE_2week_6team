import type { ReferenceRepository } from '../types'
import type { Reference, Spot, User, ExifData, AdjustmentRecipe, AiShootingGuide } from '@/types'
import { supabase } from '@/lib/supabase'
import { supabaseSpotRepository } from './spotRepository'

interface SpotRow {
  id: string
  name: string
  address: string
  description: string | null
  image_url: string
  latitude: number
  longitude: number
  tags: string[] | null
  recommended_time: string | null
  created_at: string
}

interface ProfileRow {
  id: string
  nickname: string
  email: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  created_at: string
}

interface ReferenceRow {
  id: string
  user_id: string
  spot_id: string
  title: string
  image_url: string
  aspect_ratio: number | null
  tags: string[] | null
  shot_at: string | null
  direction: number | null
  focal_length: number | null
  creator_tip: string | null
  exif: ExifData | null
  adjustment: AdjustmentRecipe | null
  source_reference_id: string | null
  // [Backend Required] 컬럼이 아직 없으면 PostgREST가 이 키를 안 주므로 undefined — 안전하게 optional 처리
  shooting_guide?: AiShootingGuide | null
  like_count: number
  comment_count: number
  created_at: string
  creator: ProfileRow | null
  spot: SpotRow | null
}

function toSpot(row: SpotRow): Spot {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    description: row.description ?? undefined,
    imageUrl: row.image_url,
    latitude: row.latitude,
    longitude: row.longitude,
    tags: row.tags ?? [],
    recommendedTime: row.recommended_time ?? undefined,
    referenceCount: 0,
    createdAt: row.created_at,
  }
}

function toUser(row: ProfileRow): User {
  return {
    id: row.id,
    nickname: row.nickname,
    email: row.email ?? '',
    avatarUrl: row.avatar_url,
    bio: row.bio ?? undefined,
    website: row.website ?? undefined,
    createdAt: row.created_at,
  }
}

// creator/spot 조인이 빠진 행은 화면에서 쓸 수 없으므로 null 반환 → 목록에서 걸러냄.
// likeCount(하트)·commentCount 는 유지되지 않는 컬럼 대신 실제 테이블 집계값을 받는다.
function toReference(row: ReferenceRow, saveCount: number, commentCount: number): Reference | null {
  if (!row.creator || !row.spot) return null
  return {
    id: row.id,
    userId: row.user_id,
    spotId: row.spot_id,
    title: row.title,
    imageUrl: row.image_url,
    aspectRatio: row.aspect_ratio ?? undefined,
    sourceReferenceId: row.source_reference_id ?? undefined,
    creator: toUser(row.creator),
    spot: toSpot(row.spot),
    tags: row.tags ?? [],
    shooting: {
      shotAt: row.shot_at ?? undefined,
      direction: row.direction ?? undefined,
      focalLength: row.focal_length ?? undefined,
      creatorTip: row.creator_tip ?? undefined,
    },
    exif: row.exif ?? undefined,
    adjustment: row.adjustment ?? undefined,
    aiShootingGuide: row.shooting_guide ?? undefined,
    likeCount: saveCount,
    commentCount,
    createdAt: row.created_at,
  }
}

// 작성자(profiles)·장소(spots)를 함께 조인해서 가져오는 select
const SELECT_WITH_RELATIONS = '*, creator:profiles!user_id(*), spot:spots!spot_id(*)'

// 저장(하트)·댓글 수를 실제 테이블에서 집계한다. references 의 like_count/comment_count
// 컬럼은 유지되지 않으므로(트리거 없음) 신뢰하지 않고 여기서 센다.
async function buildCountMaps(
  referenceIds: string[],
): Promise<{ saveCount: Map<string, number>; commentCount: Map<string, number> }> {
  const saveCount = new Map<string, number>()
  const commentCount = new Map<string, number>()
  if (referenceIds.length === 0) return { saveCount, commentCount }

  const [savesRes, commentsRes] = await Promise.all([
    supabase.from('saved_references').select('reference_id').in('reference_id', referenceIds),
    supabase.from('comments').select('reference_id').in('reference_id', referenceIds),
  ])
  if (savesRes.error) throw savesRes.error
  if (commentsRes.error) throw commentsRes.error

  for (const s of (savesRes.data as { reference_id: string }[] | null) ?? [])
    saveCount.set(s.reference_id, (saveCount.get(s.reference_id) ?? 0) + 1)
  for (const c of (commentsRes.data as { reference_id: string }[] | null) ?? [])
    commentCount.set(c.reference_id, (commentCount.get(c.reference_id) ?? 0) + 1)

  return { saveCount, commentCount }
}

export const supabaseReferenceRepository: ReferenceRepository = {
  async list(tab) {
    const { data, error } = await supabase
      .from('references')
      .select(SELECT_WITH_RELATIONS)
      .order('created_at', { ascending: false })
    if (error) throw error

    const rows = data as unknown as ReferenceRow[]
    const { saveCount, commentCount } = await buildCountMaps(rows.map((r) => r.id))
    const refs = rows
      .map((row) => toReference(row, saveCount.get(row.id) ?? 0, commentCount.get(row.id) ?? 0))
      .filter((r): r is Reference => r !== null)

    // 인기순·추천 = 저장(하트) 많은 순 (동점은 최신). new/nearby 는 최신순(위 정렬 유지).
    if (tab === undefined || tab === 'popular' || tab === 'recommended') {
      refs.sort(
        (a, b) =>
          b.likeCount - a.likeCount ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }
    return refs
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('references')
      .select(SELECT_WITH_RELATIONS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const { saveCount, commentCount } = await buildCountMaps([id])
    return toReference(data as unknown as ReferenceRow, saveCount.get(id) ?? 0, commentCount.get(id) ?? 0)
  },

  async getBySpotId(spotId) {
    const { data, error } = await supabase
      .from('references')
      .select(SELECT_WITH_RELATIONS)
      .eq('spot_id', spotId)
      .order('created_at', { ascending: false })
    if (error) throw error

    const rows = data as unknown as ReferenceRow[]
    const { saveCount, commentCount } = await buildCountMaps(rows.map((r) => r.id))
    return rows
      .map((row) => toReference(row, saveCount.get(row.id) ?? 0, commentCount.get(row.id) ?? 0))
      .filter((r): r is Reference => r !== null)
  },

  async create(input) {
    // 장소 결정: 기존 spotId 우선, 없으면 촬영 위치(photoLocation)로 새 장소 생성
    let spotId = input.spotId
    if (!spotId) {
      const loc = input.photoLocation
      if (!loc) throw new Error('장소를 선택하거나 촬영 위치를 지정해주세요.')
      const newSpot = await supabaseSpotRepository.create({
        name: input.newSpotName?.trim() || loc.placeName || loc.address || '이름 없는 장소',
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        imageUrl: input.imageUrl,
        tags: input.tags,
      })
      spotId = newSpot.id
    }

    const { data: inserted, error } = await supabase
      .from('references')
      .insert({
        user_id: input.userId,
        spot_id: spotId,
        title: input.title,
        image_url: input.imageUrl,
        aspect_ratio: input.aspectRatio ?? null,
        tags: input.tags,
        shot_at: input.exif?.shotAt ?? null,
        direction: input.direction ?? null,
        focal_length: input.exif?.focalLength ?? null,
        creator_tip: input.creatorTip ?? null,
        exif: input.exif ?? null,
        adjustment: input.adjustment ?? null,
        source_reference_id: input.sourceReferenceId ?? null,
        // [Backend Required] references.location_description 컬럼이 아직 없음 — 추가되면 아래 줄 주석 해제.
        // location_description: input.locationDescription ?? null,
      })
      .select('id')
      .single()
    if (error) throw error

    const created = await supabaseReferenceRepository.getById(inserted.id)
    if (!created) throw new Error('레퍼런스를 생성했지만 불러오지 못했어요.')
    return created
  },

  async remove(id) {
    // RLS: 본인 것만 삭제 가능 (references_delete 정책)
    const { error } = await supabase.from('references').delete().eq('id', id)
    if (error) throw error
  },

  async saveShootingGuide(id, guide) {
    // [Backend Required] references.shooting_guide 컬럼이 아직 없을 수 있음 — docs/supabase-shooting-guide.sql 참고.
    // 컬럼이 없어도 화면엔 이미 생성된 가이드가 보이고 있으므로, 캐시 저장 실패가
    // 사용자 경험을 깨지 않도록 절대 throw하지 않고 조용히 무시한다.
    const { error } = await supabase.from('references').update({ shooting_guide: guide }).eq('id', id)
    if (error) console.warn('[shooting-guide] 캐시 저장 실패(컬럼 미존재 가능):', error.message)
  },
}
