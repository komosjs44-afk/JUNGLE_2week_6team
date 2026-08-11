const SDK_SCRIPT_ATTR = 'data-kakao-maps-sdk'
const LOAD_TIMEOUT_MS = 8000

let loadPromise: Promise<typeof kakao> | null = null

/**
 * Kakao Maps JavaScript SDK 를 페이지 세션당 한 번만 로드한다.
 * - 이미 로드된 스크립트의 'load' 이벤트를 기다리다 멈추는 문제를 피하려고,
 *   window.kakao 가 이미 있으면 kakao.maps.load 를 바로 호출한다.
 * - 무한 로딩을 막는 타임아웃이 있어, 실패 시 호출부는 mock 지도로 폴백한다.
 * - libraries=services 로 장소검색(Places)·주소변환(Geocoder)도 함께 로드.
 */
export function loadKakaoMaps(): Promise<typeof kakao> {
  if (loadPromise) return loadPromise

  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY
  if (!appKey) {
    return Promise.reject(new Error('VITE_KAKAO_MAP_KEY가 설정되지 않았어요.'))
  }

  loadPromise = new Promise<typeof kakao>((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    // 무한 로딩 방지 — 시간 내 준비 안 되면 실패 처리(호출부가 mock으로 폴백)
    const timer = setTimeout(() => {
      finish(() => {
        loadPromise = null
        reject(new Error('Kakao Maps SDK 로딩 시간 초과'))
      })
    }, LOAD_TIMEOUT_MS)

    // kakao.maps.load: 지도·서비스가 준비되면 콜백 실행(이미 준비됐어도 즉시 실행)
    const init = () => {
      window.kakao.maps.load(() => {
        clearTimeout(timer)
        finish(() => resolve(window.kakao))
      })
    }

    const onError = () => {
      clearTimeout(timer)
      finish(() => {
        loadPromise = null
        reject(new Error('Kakao Maps SDK를 불러오지 못했어요.'))
      })
    }

    // 스크립트가 이미 로드돼 window.kakao 가 있으면 load 이벤트를 기다리지 않고 바로 초기화
    if (window.kakao?.maps) {
      init()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[${SDK_SCRIPT_ATTR}]`)
    if (existing) {
      existing.addEventListener('load', init)
      existing.addEventListener('error', onError)
      // 리스너 등록 직전에 이미 로드가 끝났을 수도 있으니 한 번 더 확인
      if (window.kakao?.maps) init()
      return
    }

    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`
    script.async = true
    script.setAttribute(SDK_SCRIPT_ATTR, 'true')
    script.addEventListener('load', init)
    script.addEventListener('error', onError)
    document.head.appendChild(script)
  })

  return loadPromise
}
