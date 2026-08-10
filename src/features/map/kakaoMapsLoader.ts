const SDK_SCRIPT_ATTR = 'data-kakao-maps-sdk'

let loadPromise: Promise<typeof kakao> | null = null

/**
 * Loads the Kakao Maps JavaScript SDK exactly once per page session, no matter how many
 * components call this concurrently (module-level singleton promise + a DOM check for a
 * script tag left over from a previous mount, e.g. React StrictMode's double-invoke).
 * Rejects if no API key is configured or the script fails to load, so callers can fall
 * back to the mock map instead of crashing.
 */
export function loadKakaoMaps(): Promise<typeof kakao> {
  if (typeof window !== 'undefined' && window.kakao?.maps) {
    return Promise.resolve(window.kakao)
  }

  if (loadPromise) return loadPromise

  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY

  if (!appKey) {
    return Promise.reject(new Error('VITE_KAKAO_MAP_KEY가 설정되지 않았어요.'))
  }

  loadPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      window.kakao.maps.load(() => resolve(window.kakao))
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[${SDK_SCRIPT_ATTR}]`)
    if (existing) {
      existing.addEventListener('load', onReady)
      existing.addEventListener('error', () => reject(new Error('Kakao Maps SDK를 불러오지 못했어요.')))
      return
    }

    const script = document.createElement('script')
    // libraries=services: 장소 키워드 검색(Places), 좌표→주소 변환(Geocoder) 사용
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`
    script.async = true
    script.setAttribute(SDK_SCRIPT_ATTR, 'true')
    script.addEventListener('load', onReady)
    script.addEventListener('error', () => {
      loadPromise = null
      reject(new Error('Kakao Maps SDK를 불러오지 못했어요.'))
    })
    document.head.appendChild(script)
  })

  return loadPromise
}
