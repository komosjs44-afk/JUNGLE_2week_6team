import type { AdjustmentRecipe } from '@/types'
import { ADJUSTMENT_RANGES, DEFAULT_ADJUSTMENT_RECIPE } from '@/types'
import { applyAdjustment } from './imageAdjustment'

const ANALYZE_MAX_WIDTH = 240 // 통계용 다운스케일 (빠르게)

export interface ImageStats {
  meanL: number // 평균 밝기
  stdL: number // 밝기 표준편차 (대비 지표)
  meanR: number
  meanB: number
  meanChroma: number // 평균 채도 지표 (max-min)
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

// 이미지 URL → 다운스케일된 ImageData. 교차출처는 crossOrigin으로 시도.
export function loadImageData(url: string, maxWidth = ANALYZE_MAX_WIDTH): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas 컨텍스트를 만들 수 없어요.'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      try {
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
      } catch {
        // 교차출처 이미지에 CORS 헤더가 없으면 캔버스가 오염돼 픽셀을 못 읽음
        reject(new Error('이미지를 분석할 수 없어요 (CORS).'))
      }
    }
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'))
    img.src = url
  })
}

export function analyzeStats(imageData: ImageData): ImageStats {
  const { data } = imageData
  let n = 0
  let sumL = 0
  let sumL2 = 0
  let sumR = 0
  let sumB = 0
  let sumChroma = 0
  // 4픽셀마다 샘플링 (속도)
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    sumL += l
    sumL2 += l * l
    sumR += r
    sumB += b
    sumChroma += Math.max(r, g, b) - Math.min(r, g, b)
    n++
  }
  const meanL = sumL / n
  return {
    meanL,
    stdL: Math.sqrt(Math.max(0, sumL2 / n - meanL * meanL)),
    meanR: sumR / n,
    meanB: sumB / n,
    meanChroma: sumChroma / n,
  }
}

// 내 사진(user) 통계를 레퍼런스(ref) 색감에 맞추는 보정 레시피 계산.
// applyAdjustment의 연산 순서(노출→온도→대비→채도)를 근사 역산.
export function computeMatchRecipe(user: ImageStats, ref: ImageStats): AdjustmentRecipe {
  // 1) 노출: 평균 밝기를 맞추도록 배율 → log2
  const exposureRaw = user.meanL > 1 ? Math.log2(ref.meanL / user.meanL) : 0
  const exposure = clamp(exposureRaw, ADJUSTMENT_RANGES.exposure.min, ADJUSTMENT_RANGES.exposure.max)
  const f = Math.pow(2, exposure)

  // 2) 온도: warmShift = (temp/1000)*40, r+=warmShift, b-=warmShift → (R-B) 균형 맞춤
  const warmShift = ((ref.meanR - ref.meanB) - f * (user.meanR - user.meanB)) / 2
  const temperature = clamp(
    (warmShift / 40) * 1000,
    ADJUSTMENT_RANGES.temperature.min,
    ADJUSTMENT_RANGES.temperature.max,
  )

  // 3) 대비: 노출 배율 적용 후 표준편차를 레퍼런스에 맞춤
  const contrastFactor = user.stdL > 1 ? ref.stdL / (f * user.stdL) : 1
  const contrast = clamp(
    (contrastFactor - 1) * 100,
    ADJUSTMENT_RANGES.contrast.min,
    ADJUSTMENT_RANGES.contrast.max,
  )

  // 4) 채도: 평균 채도 비율
  const satFactor = user.meanChroma > 1 ? ref.meanChroma / user.meanChroma : 1
  const saturation = clamp(
    (satFactor - 1) * 100,
    ADJUSTMENT_RANGES.saturation.min,
    ADJUSTMENT_RANGES.saturation.max,
  )

  return {
    ...DEFAULT_ADJUSTMENT_RECIPE,
    exposure: Math.round(exposure * 100) / 100,
    contrast: Math.round(contrast),
    highlights: 0,
    shadows: 0,
    saturation: Math.round(saturation),
    temperature: Math.round(temperature),
  }
}

// 내 사진 URL + 레퍼런스 URL → 자동 매칭 레시피
export async function autoMatchRecipe(userUrl: string, refUrl: string): Promise<AdjustmentRecipe> {
  const [userData, refData] = await Promise.all([loadImageData(userUrl), loadImageData(refUrl)])
  return computeMatchRecipe(analyzeStats(userData), analyzeStats(refData))
}

// 보정 결과를 원본 해상도로 렌더해서 다운로드용 Blob 생성
export function renderAdjustedBlob(url: string, recipe: AdjustmentRecipe): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas 컨텍스트를 만들 수 없어요.'))
      ctx.drawImage(img, 0, 0)
      try {
        const src = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const out = applyAdjustment(
          new ImageData(new Uint8ClampedArray(src.data), src.width, src.height),
          recipe,
        )
        ctx.putImageData(out, 0, 0)
      } catch {
        return reject(new Error('이미지를 처리할 수 없어요 (CORS).'))
      }
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지 저장 실패'))), 'image/jpeg', 0.92)
    }
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'))
    img.src = url
  })
}
