import type { RouteRepository } from '../types'
import type { Route, RouteSpot, Spot } from '@/types'
import { supabase } from '@/lib/supabase'
import { haversineMeters } from '@/utils/spotMatching'

// DB(snake_case) → 프론트 타입(camelCase). ranking/spot 리포지토리와 동일한 매핑.
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

// 코스 구성 파라미터 — 값이 곧 "추천 코스가 어떤 느낌인지"를 결정한다.
const MAX_STOPS = 4 // 하루 촬영 나들이로 무리 없는 정거장 수
const MAX_HOP_KM = 3 // 스팟 사이 최대 도보 거리. 이보다 멀면 코스를 끊는다 (도보 코스이므로 도시를 넘나들지 않게)
const WALK_SPEED_KMH = 4.5 // 평균 보행 속도
const SHOOT_MINUTES = 30 // 스팟당 촬영/머무는 시간
const START_TIME_MINUTES = 16 * 60 // 첫 스팟 도착 기준 시각 16:00 (골든아워 대비)

function walkMinutes(km: number): number {
  return Math.round((km / WALK_SPEED_KMH) * 60)
}

function formatClock(totalMinutes: number): string {
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const supabaseRouteRepository: RouteRepository = {
  async getRecommended(): Promise<Route> {
    // ranking 과 같은 방식으로 spot별 reference 수·like 수를 집계해 "인기 스팟"을 뽑는다.
    const { data: spotData, error: spotError } = await supabase.from('spots').select('*')
    if (spotError) throw spotError

    const { data: referenceData, error: referenceError } = await supabase
      .from('references')
      .select('id, spot_id')
    if (referenceError) throw referenceError

    const { data: likeData, error: likeError } = await supabase.from('likes').select('reference_id')
    if (likeError) throw likeError

    const spots = spotData as SpotRow[]
    const references = (referenceData as { id: string; spot_id: string }[]) ?? []
    const likes = (likeData as { reference_id: string }[]) ?? []

    const refCountBySpot = new Map<string, number>()
    for (const r of references) {
      refCountBySpot.set(r.spot_id, (refCountBySpot.get(r.spot_id) ?? 0) + 1)
    }

    const likeCountByRef = new Map<string, number>()
    for (const l of likes) {
      likeCountByRef.set(l.reference_id, (likeCountByRef.get(l.reference_id) ?? 0) + 1)
    }

    const likeCountBySpot = new Map<string, number>()
    for (const r of references) {
      const refLikes = likeCountByRef.get(r.id) ?? 0
      likeCountBySpot.set(r.spot_id, (likeCountBySpot.get(r.spot_id) ?? 0) + refLikes)
    }

    const withCounts = spots.map((row) => ({
      row,
      referenceCount: refCountBySpot.get(row.id) ?? 0,
      likeCount: likeCountBySpot.get(row.id) ?? 0,
    }))

    // 실제로 촬영된(레퍼런스가 있는) 스팟을 우선. 하나도 없으면 최신 스팟으로라도 코스를 만든다.
    const photographed = withCounts.filter((s) => s.referenceCount > 0)
    const pool = photographed.length > 0 ? photographed : withCounts

    if (pool.length === 0) {
      throw new Error('추천할 촬영 스팟이 아직 없어요.')
    }

    // 도보로 이을 수 있는 이웃(MAX_HOP_KM 이내)이 많은 스팟일수록 좋은 시작점이다.
    // 걸어 다닐 코스라, 인기 하나만 보고 외딴 스팟을 골랐다가 다음 구간이 몇 km씩
    // 벌어지는 걸 막으려면 "밀집도"를 시드 선정의 1순위로 둔다.
    const walkableNeighbors = (self: (typeof pool)[number]) =>
      pool.filter(
        (other) =>
          other !== self &&
          haversineMeters(
            { lat: self.row.latitude, lng: self.row.longitude },
            { lat: other.row.latitude, lng: other.row.longitude },
          ) <=
            MAX_HOP_KM * 1000,
      ).length

    const neighborCount = new Map(pool.map((s) => [s.row.id, walkableNeighbors(s)]))

    // 밀집도 → 좋아요 → 레퍼런스 수 → 최신 (ranking 의 top10 기준과 일관)
    pool.sort((a, b) => {
      const na = neighborCount.get(a.row.id) ?? 0
      const nb = neighborCount.get(b.row.id) ?? 0
      if (nb !== na) return nb - na
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount
      if (b.referenceCount !== a.referenceCount) return b.referenceCount - a.referenceCount
      return new Date(b.row.created_at).getTime() - new Date(a.row.created_at).getTime()
    })

    // 시드에서 가까운 스팟을 차례로 잇는 greedy nearest-neighbor.
    // 다음 스팟이 MAX_HOP_KM 를 넘으면 거기서 코스를 끊는다.
    const chosen: (typeof pool)[number][] = [pool[0]]
    const remaining = pool.slice(1)

    while (chosen.length < MAX_STOPS && remaining.length > 0) {
      const last = chosen[chosen.length - 1].row
      let bestIdx = -1
      let bestMeters = Infinity
      for (let i = 0; i < remaining.length; i++) {
        const cand = remaining[i].row
        const meters = haversineMeters(
          { lat: last.latitude, lng: last.longitude },
          { lat: cand.latitude, lng: cand.longitude },
        )
        if (meters < bestMeters) {
          bestMeters = meters
          bestIdx = i
        }
      }
      if (bestIdx === -1 || bestMeters > MAX_HOP_KM * 1000) break
      chosen.push(remaining.splice(bestIdx, 1)[0])
    }

    // 구간 거리 → 도보 시간 → 도착 시각을 누적으로 계산한다.
    let totalMeters = 0
    let clock = START_TIME_MINUTES
    const routeSpots: RouteSpot[] = chosen.map((item, index) => {
      const arrivalTime = formatClock(clock)
      let walkToNext: number | undefined
      if (index < chosen.length - 1) {
        const next = chosen[index + 1].row
        const meters = haversineMeters(
          { lat: item.row.latitude, lng: item.row.longitude },
          { lat: next.latitude, lng: next.longitude },
        )
        totalMeters += meters
        walkToNext = walkMinutes(meters / 1000)
        clock += SHOOT_MINUTES + walkToNext
      }
      return {
        order: index + 1,
        spot: toSpot(item.row, item.referenceCount),
        arrivalTime,
        ...(walkToNext !== undefined ? { walkMinutesToNext: walkToNext } : {}),
      }
    })

    const totalDistanceKm = Math.round((totalMeters / 1000) * 10) / 10
    const totalWalkMinutes = routeSpots.reduce((sum, rs) => sum + (rs.walkMinutesToNext ?? 0), 0)
    const totalDurationMinutes = totalWalkMinutes + SHOOT_MINUTES * routeSpots.length

    return {
      id: 'route-recommended',
      title: '오늘의 추천 촬영 코스',
      description:
        photographed.length > 0
          ? `인기 있는 촬영 스팟 ${routeSpots.length}곳을 가까운 순서로 묶었어요.`
          : `등록된 촬영 스팟 ${routeSpots.length}곳으로 코스를 구성했어요.`,
      spots: routeSpots,
      totalDistanceKm,
      totalDurationMinutes,
      createdAt: new Date().toISOString(),
    }
  },
}
