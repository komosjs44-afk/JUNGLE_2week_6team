// 세그멘테이션 마스크를 이용한 "영역별 색 보정" POC 로직.
// 각 클래스(하늘/건물/나무/인물…)마다 내 사진 vs 레퍼런스의 색 통계를 따로 재고,
// 영역별 recipe 를 만들어 픽셀마다 자기 영역의 recipe 를 적용한다.
// (경계 페더링은 아직 없음 — 품질 판단용 POC. 하드 경계라도 방향은 평가 가능)
import type { AdjustmentRecipe } from '@/types'
import { computeMatchRecipe, type ImageStats } from '@/utils/colorMatch'
import type { Segment } from './segmentImage'

const MIN_REGION_PIXELS = 300 // 이보다 작은 영역은 통계가 불안정해 개별 보정하지 않는다

// 마스크 on 픽셀만으로 ImageStats 계산 (colorMatch.analyzeStats 의 마스크 버전)
export function statsForMask(img: ImageData, mask: Uint8Array): ImageStats | null {
  const { data, width, height } = img
  const n = width * height
  let count = 0
  let sumL = 0
  let sumL2 = 0
  let sumR = 0
  let sumB = 0
  let sumChroma = 0
  let sumHi = 0
  let nHi = 0
  let sumLo = 0
  let nLo = 0
  for (let p = 0; p < n; p++) {
    if (mask[p] <= 127) continue
    const i = p * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    sumL += l
    sumL2 += l * l
    sumR += r
    sumB += b
    sumChroma += Math.max(r, g, b) - Math.min(r, g, b)
    if (l > 128) {
      sumHi += l
      nHi++
    } else {
      sumLo += l
      nLo++
    }
    count++
  }
  if (count < MIN_REGION_PIXELS) return null
  const meanL = sumL / count
  return {
    meanL,
    stdL: Math.sqrt(Math.max(0, sumL2 / count - meanL * meanL)),
    meanR: sumR / count,
    meanB: sumB / count,
    meanChroma: sumChroma / count,
    meanHiL: nHi > 0 ? sumHi / nHi : -1,
    meanLoL: nLo > 0 ? sumLo / nLo : -1,
  }
}

// region  = 레퍼런스에 같은 클래스가 있어 영역끼리 매칭
// ref-global = 짝이 없어 레퍼런스 "전체 톤"을 기준으로 매칭 (똑똑한 폴백)
// global   = 두 장면이 너무 달라 전체 톤 이식으로 전환된 상태
export type RegionBasis = 'region' | 'ref-global' | 'global'

export interface RegionPlan {
  label: string
  coverage: number
  basis: RegionBasis
  recipe: AdjustmentRecipe
}

// 영역 간 편차가 튀지 않게 각 영역 recipe 를 전역 보정 쪽으로 섞는다 (얼룩·seam 완화)
const MATCHED_WEIGHT = 0.8 // 같은 요소끼리 매칭 → 영역값을 강하게 신뢰
const UNMATCHED_WEIGHT = 0.45 // 레퍼런스 전체 톤으로의 근사 → 전역과 더 섞어 보수적으로
// 겹치는(대응되는) 영역이 이 비율보다 적으면 영역별을 끄고 전체 톤 이식만 한다
const MIN_SHARED_COVERAGE = 0.15
// 짝 없는 영역(예: 하늘 레퍼런스에 맞추는 바다)이 엉뚱한 색으로 과하게 튀는 걸 막는 상한.
// 색(채도·색온도)만 조여서 "바다가 형광 초록으로" 같은 과보정을 방지 (밝기·대비는 그대로).
const UNMATCHED_SAT_CAP = 18 // 채도 이동 상한 (기본 ±50)
const UNMATCHED_TEMP_CAP = 450 // 색온도 이동 상한 (기본 ±1000)

function clampAbs(v: number, cap: number): number {
  return v > cap ? cap : v < -cap ? -cap : v
}

function lerpRecipe(base: AdjustmentRecipe, target: AdjustmentRecipe, w: number): AdjustmentRecipe {
  const mix = (a: number, b: number) => a + (b - a) * w
  return {
    exposure: Math.round(mix(base.exposure, target.exposure) * 100) / 100,
    contrast: Math.round(mix(base.contrast, target.contrast)),
    highlights: Math.round(mix(base.highlights, target.highlights)),
    shadows: Math.round(mix(base.shadows, target.shadows)),
    saturation: Math.round(mix(base.saturation, target.saturation)),
    temperature: Math.round(mix(base.temperature, target.temperature)),
  }
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

// imageAdjustment.applyAdjustment 과 동일한 픽셀 연산. recipe 가 픽셀마다 다를 수 있고(영역별),
// 페더링에서 파라미터가 보간되므로 recipe 객체가 아니라 개별 값으로 받는다.
function adjustPixelParams(
  r0: number,
  g0: number,
  b0: number,
  exposure: number,
  contrast: number,
  highlights: number,
  shadows: number,
  saturation: number,
  temperature: number,
): [number, number, number] {
  const ef = Math.pow(2, exposure)
  const cf = 1 + contrast / 100
  const sf = 1 + saturation / 100
  const ws = (temperature / 1000) * 40
  const ha = highlights / 100
  const sa = shadows / 100
  let r = r0 * ef
  let g = g0 * ef
  let b = b0 * ef
  r += ws
  b -= ws
  r = (r - 128) * cf + 128
  g = (g - 128) * cf + 128
  b = (b - 128) * cf + 128
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  if (lum > 128) {
    const w = ((lum - 128) / 127) * ha * 40
    r += w
    g += w
    b += w
  } else {
    const w = ((128 - lum) / 128) * sa * 40
    r += w
    g += w
    b += w
  }
  const fl = 0.299 * r + 0.587 * g + 0.114 * b
  r = fl + (r - fl) * sf
  g = fl + (g - fl) * sf
  b = fl + (b - fl) * sf
  return [clamp255(r), clamp255(g), clamp255(b)]
}

// 분리형(가로·세로) 박스 블러 — recipe 파라미터 장을 번지게 해 영역 경계를 부드럽게 잇는다(페더링).
// running-sum 이라 반경과 무관하게 O(n).
function boxBlur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  if (radius < 1) return src
  const win = radius * 2 + 1
  const tmp = new Float32Array(src.length)
  for (let y = 0; y < height; y++) {
    const row = y * width
    let sum = 0
    for (let k = -radius; k <= radius; k++) sum += src[row + Math.min(width - 1, Math.max(0, k))]
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / win
      const xin = row + Math.min(width - 1, x + radius + 1)
      const xout = row + Math.max(0, x - radius)
      sum += src[xin] - src[xout]
    }
  }
  const out = new Float32Array(src.length)
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let k = -radius; k <= radius; k++) sum += tmp[Math.min(height - 1, Math.max(0, k)) * width + x]
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / win
      const yin = Math.min(height - 1, y + radius + 1) * width + x
      const yout = Math.max(0, y - radius) * width + x
      sum += tmp[yin] - tmp[yout]
    }
  }
  return out
}

// 저해상도 recipe 장을 출력 해상도에서 부드럽게 읽기 위한 bilinear 샘플
function sampleBilinear(field: Float32Array, w: number, h: number, fx: number, fy: number): number {
  const x = fx < 0 ? 0 : fx > w - 1 ? w - 1 : fx
  const y = fy < 0 ? 0 : fy > h - 1 ? h - 1 : fy
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(w - 1, x0 + 1)
  const y1 = Math.min(h - 1, y0 + 1)
  const dx = x - x0
  const dy = y - y0
  const a = field[y0 * w + x0]
  const b = field[y0 * w + x1]
  const c = field[y1 * w + x0]
  const d = field[y1 * w + x1]
  return a * (1 - dx) * (1 - dy) + b * dx * (1 - dy) + c * (1 - dx) * dy + d * dx * dy
}

export interface RegionalMatchResult {
  output: ImageData
  regions: RegionPlan[]
  globalOnly: boolean // 장면이 너무 달라 전체 톤 이식으로 전환됐는가
  sharedCoverage: number // 레퍼런스와 대응된(같은 클래스) 영역 비율
}

/**
 * 영역별 보정 실행 (똑똑한 폴백 + 페더링).
 * 분할 해상도(mySegImg)와 출력 해상도(myFullImg)를 분리한다: 통계·마스크·recipe 장은 작은
 * mySegImg 에서 만들고, 완성된(블러된) recipe 장을 큰 myFullImg 에 bilinear 업샘플해 적용
 * → 저해상도로 보정해서 생기던 화질 저하가 사라진다.
 * @param mySegImg     분할 해상도 내 사진 (마스크와 같은 크기)
 * @param myFullImg    출력(원본급) 해상도 내 사진 — 실제 보정 적용 대상
 * @param mySegments   내 사진 세그먼트들 (마스크는 mySegImg 크기)
 * @param refStatsByLabel 레퍼런스 클래스별 통계
 * @param refGlobalStats 레퍼런스 전체 통계 (짝 없는 영역 기준)
 * @param globalRecipe 전역 recipe (편차 완화 앵커 + 전체 톤 이식 폴백)
 */
export function regionalMatch(
  mySegImg: ImageData,
  myFullImg: ImageData,
  mySegments: Segment[],
  refStatsByLabel: Map<string, ImageStats>,
  refGlobalStats: ImageStats,
  globalRecipe: AdjustmentRecipe,
): RegionalMatchResult {
  const segW = mySegImg.width
  const segH = mySegImg.height
  const segN = segW * segH

  // 대응(같은 클래스) 영역이 전체에서 얼마나 되는지 — 너무 적으면 전체 톤 이식으로 전환
  let sharedCoverage = 0
  for (const seg of mySegments) {
    if (refStatsByLabel.has(seg.label)) sharedCoverage += seg.coverage
  }
  const globalOnly = sharedCoverage < MIN_SHARED_COVERAGE

  // 클래스별 recipe 결정
  const recipeBySeg: AdjustmentRecipe[] = []
  const regions: RegionPlan[] = []
  for (const seg of mySegments) {
    if (globalOnly) {
      recipeBySeg.push(globalRecipe)
      regions.push({ label: seg.label, coverage: seg.coverage, basis: 'global', recipe: globalRecipe })
      continue
    }
    const myStats = statsForMask(mySegImg, seg.mask)
    const refStats = refStatsByLabel.get(seg.label)
    if (myStats && refStats) {
      // 같은 요소끼리 — 영역별 매칭 후 전역과 살짝 섞어 coherence 유지
      const recipe = lerpRecipe(globalRecipe, computeMatchRecipe(myStats, refStats), MATCHED_WEIGHT)
      recipeBySeg.push(recipe)
      regions.push({ label: seg.label, coverage: seg.coverage, basis: 'region', recipe })
    } else if (myStats) {
      // 짝이 없는 요소 — 레퍼런스 "전체 톤"을 기준으로 맞추되, 색(채도·색온도) 이동을 조여
      // 과보정(예: 바다가 과하게 초록)을 막고 전역과 더 섞어 안전하게
      const raw = computeMatchRecipe(myStats, refGlobalStats)
      const tamed = {
        ...raw,
        saturation: clampAbs(raw.saturation, UNMATCHED_SAT_CAP),
        temperature: clampAbs(raw.temperature, UNMATCHED_TEMP_CAP),
      }
      const recipe = lerpRecipe(globalRecipe, tamed, UNMATCHED_WEIGHT)
      recipeBySeg.push(recipe)
      regions.push({ label: seg.label, coverage: seg.coverage, basis: 'ref-global', recipe })
    } else {
      // 영역이 너무 작아 통계 불가 — 전역
      recipeBySeg.push(globalRecipe)
      regions.push({ label: seg.label, coverage: seg.coverage, basis: 'global', recipe: globalRecipe })
    }
  }

  // 픽셀 → 세그먼트 인덱스 (분할 해상도. semantic 은 상호배타적, 혹시 겹치면 먼저 온 것 우선)
  const segIdx = new Int16Array(segN).fill(-1)
  mySegments.forEach((seg, si) => {
    const m = seg.mask
    for (let p = 0; p < segN; p++) if (segIdx[p] === -1 && m[p] > 127) segIdx[p] = si
  })

  // recipe 6개 파라미터를 분할 해상도 장으로 펼친다 (영역에 안 속한 픽셀은 전역값)
  const fExp = new Float32Array(segN)
  const fCon = new Float32Array(segN)
  const fHi = new Float32Array(segN)
  const fSh = new Float32Array(segN)
  const fSat = new Float32Array(segN)
  const fTemp = new Float32Array(segN)
  for (let p = 0; p < segN; p++) {
    const rec = segIdx[p] >= 0 ? recipeBySeg[segIdx[p]] : globalRecipe
    fExp[p] = rec.exposure
    fCon[p] = rec.contrast
    fHi[p] = rec.highlights
    fSh[p] = rec.shadows
    fSat[p] = rec.saturation
    fTemp[p] = rec.temperature
  }

  // 경계 페더링: 분할 해상도에서 파라미터 장을 블러 → 이후 업샘플하면 경계가 더 매끄럽다.
  // 전체 톤 이식(globalOnly)일 땐 장이 균일하므로 블러 생략.
  const radius = globalOnly ? 0 : Math.max(3, Math.round(Math.max(segW, segH) * 0.02))
  const bExp = boxBlur(fExp, segW, segH, radius)
  const bCon = boxBlur(fCon, segW, segH, radius)
  const bHi = boxBlur(fHi, segW, segH, radius)
  const bSh = boxBlur(fSh, segW, segH, radius)
  const bSat = boxBlur(fSat, segW, segH, radius)
  const bTemp = boxBlur(fTemp, segW, segH, radius)

  // 출력(원본급) 해상도에 recipe 장을 bilinear 업샘플해 적용 → 화질 유지
  const outW = myFullImg.width
  const outH = myFullImg.height
  const src = myFullImg.data
  const out = new Uint8ClampedArray(src.length)
  const sx = segW / outW
  const sy = segH / outH
  for (let oy = 0; oy < outH; oy++) {
    const fy = (oy + 0.5) * sy - 0.5
    for (let ox = 0; ox < outW; ox++) {
      const fx = (ox + 0.5) * sx - 0.5
      const i = (oy * outW + ox) * 4
      const [r, g, b] = adjustPixelParams(
        src[i],
        src[i + 1],
        src[i + 2],
        sampleBilinear(bExp, segW, segH, fx, fy),
        sampleBilinear(bCon, segW, segH, fx, fy),
        sampleBilinear(bHi, segW, segH, fx, fy),
        sampleBilinear(bSh, segW, segH, fx, fy),
        sampleBilinear(bSat, segW, segH, fx, fy),
        sampleBilinear(bTemp, segW, segH, fx, fy),
      )
      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = src[i + 3]
    }
  }
  return { output: new ImageData(out, outW, outH), regions, globalOnly, sharedCoverage }
}

// 라벨 → 안정적인 색 (오버레이 시각화용)
const OVERLAY_COLORS = [
  [98, 116, 76], [176, 78, 114], [91, 117, 150], [163, 101, 31],
  [122, 107, 168], [63, 122, 117], [200, 120, 60], [80, 160, 90],
]
export function labelColor(label: string): [number, number, number] {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0
  return OVERLAY_COLORS[h % OVERLAY_COLORS.length] as [number, number, number]
}

// 세그먼트들을 색으로 칠한 오버레이 ImageData 생성
export function renderOverlay(segments: Segment[], width: number, height: number): ImageData {
  const n = width * height
  const out = new Uint8ClampedArray(n * 4)
  const assigned = new Int16Array(n).fill(-1)
  segments.forEach((seg, si) => {
    const m = seg.mask
    for (let p = 0; p < n; p++) if (assigned[p] === -1 && m[p] > 127) assigned[p] = si
  })
  for (let p = 0; p < n; p++) {
    const si = assigned[p]
    const i = p * 4
    if (si >= 0) {
      const [r, g, b] = labelColor(segments[si].label)
      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = 255
    } else {
      out[i + 3] = 0
    }
  }
  return new ImageData(out, width, height)
}
