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
const SEARCH_TIMEOUT_MS = 7000

export async function searchPlaces(keyword: string): Promise<PlaceSearchResult[]> {
  const kakao = await loadKakaoMaps()
  if (!kakao.maps.services) {
    // libraries=services 가 로드되지 않은 경우 (예: 캐시된 옛 SDK)
    throw new Error('장소 검색 모듈을 불러오지 못했어요. 새로고침(Ctrl+Shift+R) 해주세요.')
  }
  const places = new kakao.maps.services.Places()

  return new Promise<PlaceSearchResult[]>((resolve, reject) => {
    // keywordSearch 콜백이 안 돌아오는 경우(도메인/네트워크 문제)를 대비한 타임아웃
    const timer = setTimeout(() => reject(new Error('장소 검색 응답이 없어요. 도메인 등록/네트워크를 확인해주세요.')), SEARCH_TIMEOUT_MS)
    places.keywordSearch(keyword, (data, status) => {
      clearTimeout(timer)
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
