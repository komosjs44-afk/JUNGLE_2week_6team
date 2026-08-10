import { loadKakaoMaps } from './kakaoMapsLoader'

export interface PlaceSearchResult {
  latitude: number
  longitude: number
  placeName: string
  address: string
  source: 'search'
}

/**
 * Keyword search against Kakao's real place database via services.Places — replaces filtering
 * the local Spot list by substring. Returns [] for "no results", and throws only for a genuine
 * API/network failure so callers can tell the two apart (brief: "결과 없음" vs "검색 실패").
 */
export async function searchPlaces(keyword: string): Promise<PlaceSearchResult[]> {
  const kakao = await loadKakaoMaps()
  const places = new kakao.maps.services.Places()

  return new Promise<PlaceSearchResult[]>((resolve, reject) => {
    places.keywordSearch(keyword, (data, status) => {
      if (status === 'ZERO_RESULT') {
        resolve([])
        return
      }
      if (status !== 'OK') {
        reject(new Error('장소 검색에 실패했어요.'))
        return
      }
      resolve(
        data.map((item) => ({
          latitude: Number(item.y),
          longitude: Number(item.x),
          placeName: item.place_name,
          address: item.road_address_name || item.address_name,
          source: 'search' as const,
        })),
      )
    })
  })
}
