import { loadKakaoMaps } from './kakaoMapsLoader'

export interface PlaceResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
}

// 카카오 장소 키워드 검색 (등록 안 된 장소도 전국에서 검색)
export async function searchPlaces(keyword: string): Promise<PlaceResult[]> {
  const q = keyword.trim()
  if (!q) return []
  const kakao = await loadKakaoMaps()
  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places()
    places.keywordSearch(q, (result, status) => {
      if (status === kakao.maps.services.Status.OK) {
        resolve(
          result.map((r) => ({
            id: r.id,
            name: r.place_name,
            address: r.road_address_name || r.address_name,
            lat: parseFloat(r.y),
            lng: parseFloat(r.x),
          })),
        )
      } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        resolve([])
      } else {
        reject(new Error('장소 검색에 실패했어요.'))
      }
    })
  })
}

// 좌표 → 주소 (지도에서 직접 찍었을 때 주소 얻기)
export async function coordToAddress(lat: number, lng: number): Promise<string> {
  const kakao = await loadKakaoMaps()
  return new Promise((resolve) => {
    const geocoder = new kakao.maps.services.Geocoder()
    geocoder.coord2Address(lng, lat, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result[0]) {
        resolve(result[0].road_address?.address_name || result[0].address?.address_name || '')
      } else {
        resolve('')
      }
    })
  })
}
