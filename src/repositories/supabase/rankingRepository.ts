import type { RankingRepository } from '../types'
import type { RankingTab, Spot } from '@/types'
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

interface ReferenceRow {
  id: string
  spot_id: string
}

interface LikeRow {
  reference_id: string
}

function toSpot(row: SpotRow, referenceCount: number): Spot {
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
    referenceCount,
    createdAt: row.created_at,
  }
}

export const supabaseRankingRepository: RankingRepository = {
  async getEntries(tab: RankingTab) {
    const { data: spotData, error: spotError } = await supabase
      .from('spots')
      .select('*')

    if (spotError) throw spotError

    const { data: referenceData, error: referenceError } = await supabase
      .from('references')
      .select('id, spot_id')

    if (referenceError) throw referenceError

    const { data: likeData, error: likeError } = await supabase
      .from('likes')
      .select('reference_id')

    if (likeError) throw likeError

    const spots = spotData as SpotRow[]
    const references = referenceData as ReferenceRow[]
    const likes = likeData as LikeRow[]

    // spot별 reference 개수
    const referenceCountBySpot = new Map<string, number>()

    for (const reference of references) {
      referenceCountBySpot.set(
        reference.spot_id,
        (referenceCountBySpot.get(reference.spot_id) ?? 0) + 1,
      )
    }

    // reference별 like 개수
    const likeCountByReference = new Map<string, number>()

    for (const like of likes) {
      likeCountByReference.set(
        like.reference_id,
        (likeCountByReference.get(like.reference_id) ?? 0) + 1,
      )
    }

    // spot별 전체 like 개수
    const likeCountBySpot = new Map<string, number>()

    for (const reference of references) {
      const likeCount = likeCountByReference.get(reference.id) ?? 0

      likeCountBySpot.set(
        reference.spot_id,
        (likeCountBySpot.get(reference.spot_id) ?? 0) + likeCount,
      )
    }

    const entries = spots
      .map((row) => {
        const referenceCount = referenceCountBySpot.get(row.id) ?? 0
        const likeCount = likeCountBySpot.get(row.id) ?? 0

        return {
          rank: 0,
          spot: toSpot(row, referenceCount),
          tags: row.tags ?? [],
          likeCount,
          referenceCount,
        }
      })
      // 레퍼런스가 하나도 없는(전부 삭제된 포함) 스팟은 랭킹에서 제외
      .filter((entry) => entry.referenceCount > 0)

    // 기존 더미 데이터의 랭킹 기준을 실제 DB에서도 동일하게 적용
    switch (tab) {
      case 'new':
        entries.sort(
          (a, b) =>
            new Date(b.spot.createdAt).getTime() -
            new Date(a.spot.createdAt).getTime(),
        )
        break

      case 'rising':
        entries.sort((a, b) => {
          if (b.referenceCount !== a.referenceCount) {
            return b.referenceCount - a.referenceCount
          }

          return (
            new Date(b.spot.createdAt).getTime() -
            new Date(a.spot.createdAt).getTime()
          )
        })
        break

      case 'top10':
        entries.sort((a, b) => {
          if (b.likeCount !== a.likeCount) {
            return b.likeCount - a.likeCount
          }

          return (
            new Date(b.spot.createdAt).getTime() -
            new Date(a.spot.createdAt).getTime()
          )
        })
        break
    }

    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }))
  },
}