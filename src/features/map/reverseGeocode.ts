import { loadKakaoMaps } from './kakaoMapsLoader'

/**
 * Converts coordinates to a short, human-readable region label (e.g. "성동구 성수동2가",
 * "용인시 처인구 유방동") via Kakao's coord2Address. Returns null on failure or no result —
 * callers should keep the raw coordinates and just skip showing an address, never throw.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const kakao = await loadKakaoMaps()
    const geocoder = new kakao.maps.services.Geocoder()

    return await new Promise<string | null>((resolve) => {
      geocoder.coord2Address(lng, lat, (result, status) => {
        if (status !== 'OK' || !result[0]?.address) {
          resolve(null)
          return
        }
        const { region_2depth_name, region_3depth_name } = result[0].address
        resolve([region_2depth_name, region_3depth_name].filter(Boolean).join(' ') || null)
      })
    })
  } catch {
    return null
  }
}
