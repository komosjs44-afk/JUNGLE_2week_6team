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

interface SaveRow {
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

    // 인기 지표 = 저장(하트) 수. 앱의 실제 사용자 동작이 "저장(saved_references)"이라
    // 이 테이블을 집계한다. (likes 테이블은 앱에서 쓰지 않아 항상 비어 있었음)
    const { data: saveData, error: saveError } = await supabase
      .from('saved_references')
      .select('reference_id')

    if (saveError) throw saveError

    const spots = spotData as SpotRow[]
    const references = referenceData as ReferenceRow[]
    const saves = (saveData as SaveRow[] | null) ?? []

    // spot별 reference 개수
    const referenceCountBySpot = new Map<string, number>()

    for (const reference of references) {
      referenceCountBySpot.set(
        reference.spot_id,
        (referenceCountBySpot.get(reference.spot_id) ?? 0) + 1,
      )
    }

    // reference별 저장 개수
    const saveCountByReference = new Map<string, number>()

    for (const save of saves) {
      saveCountByReference.set(
        save.reference_id,
        (saveCountByReference.get(save.reference_id) ?? 0) + 1,
      )
    }

    // spot별 전체 저장 개수 (= 화면의 하트 수)
    const likeCountBySpot = new Map<string, number>()

    for (const reference of references) {
      const saveCount = saveCountByReference.get(reference.id) ?? 0

      likeCountBySpot.set(
        reference.spot_id,
        (likeCountBySpot.get(reference.spot_id) ?? 0) + saveCount,
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