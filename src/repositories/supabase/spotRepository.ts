import type { SpotRepository } from '../types'
import type { Spot } from '@/types'
import { supabase } from '@/lib/supabase'

// DB(snake_case) 한 줄 → 프론트 타입(camelCase)로 변환
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
    referenceCount: 0, // TODO: references 테이블 count 연동 시 채우기
    createdAt: row.created_at,
  }
}

export const supabaseSpotRepository: SpotRepository = {
  async list(query) {
    let request = supabase.from('spots').select('*').order('created_at', { ascending: false })

    if (query) {
      // 이름 부분일치 검색 (태그 검색은 추후 확장)
      request = request.ilike('name', `%${query.trim()}%`)
    }

    const { data, error } = await request
    if (error) throw error
    return (data as SpotRow[]).map(toSpot)
  },

  async getById(id) {
    const { data, error } = await supabase.from('spots').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? toSpot(data as SpotRow) : null
  },

  async create(input) {
    const { data, error } = await supabase
      .from('spots')
      .insert({
        name: input.name,
        address: input.address ?? '',
        image_url: input.imageUrl,
        latitude: input.latitude,
        longitude: input.longitude,
        tags: input.tags ?? [],
      })
      .select('*')
      .single()
    if (error) throw error
    return toSpot(data as SpotRow)
  },
}
