import type { ReferenceRepository, DiscoverTab } from '../types'
import type { Reference, Spot, User, ExifData, AdjustmentRecipe } from '@/types'
import { supabase } from '@/lib/supabase'

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
  tags: string[] | null
  shot_at: string | null
  direction: number | null
  focal_length: number | null
  creator_tip: string | null
  exif: ExifData | null
  adjustment: AdjustmentRecipe | null
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

// creator/spot 조인이 빠진 행은 화면에서 쓸 수 없으므로 null 반환 → 목록에서 걸러냄
function toReference(row: ReferenceRow): Reference | null {
  if (!row.creator || !row.spot) return null
  return {
    id: row.id,
    userId: row.user_id,
    spotId: row.spot_id,
    title: row.title,
    imageUrl: row.image_url,
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
    likeCount: row.like_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
  }
}

// 작성자(profiles)·장소(spots)를 함께 조인해서 가져오는 select
const SELECT_WITH_RELATIONS = '*, creator:profiles!user_id(*), spot:spots!spot_id(*)'

function orderFor(tab: DiscoverTab | undefined) {
  switch (tab) {
    case 'popular':
      return { column: 'like_count', ascending: false }
    case 'new':
    case 'nearby': // 위치 기반 정렬은 추후. 지금은 최신순으로 대체
      return { column: 'created_at', ascending: false }
    case 'recommended':
    default:
      return { column: 'like_count', ascending: false }
  }
}

export const supabaseReferenceRepository: ReferenceRepository = {
  async list(tab) {
    const order = orderFor(tab)
    const { data, error } = await supabase
      .from('references')
      .select(SELECT_WITH_RELATIONS)
      .order(order.column, { ascending: order.ascending })
    if (error) throw error
    return (data as unknown as ReferenceRow[]).map(toReference).filter((r): r is Reference => r !== null)
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('references')
      .select(SELECT_WITH_RELATIONS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ? toReference(data as unknown as ReferenceRow) : null
  },

  async getBySpotId(spotId) {
    const { data, error } = await supabase
      .from('references')
      .select(SELECT_WITH_RELATIONS)
      .eq('spot_id', spotId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as ReferenceRow[]).map(toReference).filter((r): r is Reference => r !== null)
  },

  async create(input) {
    // 장소 결정: 기존 spotId 우선, 없으면 새 장소 이름으로 생성
    let spotId = input.spotId
    if (!spotId) {
      if (!input.newSpotName?.trim()) throw new Error('장소를 선택하거나 새 장소 이름을 입력해주세요.')
      const { data: newSpot, error: spotError } = await supabase
        .from('spots')
        .insert({
          name: input.newSpotName.trim(),
          address: input.newSpotAddress ?? '',
          image_url: input.imageUrl,
          latitude: input.newSpotLat ?? input.exif?.latitude ?? 0,
          longitude: input.newSpotLng ?? input.exif?.longitude ?? 0,
          tags: input.tags,
        })
        .select('id')
        .single()
      if (spotError) throw spotError
      spotId = newSpot.id
    }

    const { data: inserted, error } = await supabase
      .from('references')
      .insert({
        user_id: input.userId,
        spot_id: spotId,
        title: input.title,
        image_url: input.imageUrl,
        tags: input.tags,
        shot_at: input.exif?.shotAt ?? null,
        direction: input.direction ?? null,
        focal_length: input.exif?.focalLength ?? null,
        creator_tip: input.creatorTip ?? null,
        exif: input.exif ?? null,
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
}
