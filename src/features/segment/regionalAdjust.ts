// 영역별(의미 분할 기반) 색 보정 오케스트레이션 — 실제 화면(AiAdjustPage)에서 쓰는 진입점.
// 무거운 세그멘테이션은 여기서만 다루고, 이 모듈 자체를 동적 import 해서 본 번들에서 분리한다.
import type { AdjustmentRecipe } from '@/types'
import { autoMatchRecipe, analyzeStats, type ImageStats } from '@/utils/colorMatch'
import { segmentImage, DEFAULT_SEG_MODEL, type ProgressFn } from './segmentImage'
import { regionalMatch, statsForMask } from './regionalMatch'

const SEG_DIM = 640 // 분할 입력 크기 (작게 = 빠름, 품질과 무관)
const OUTPUT_MAX_DIM = 1600 // 보정 적용(출력) 해상도 상한

function downscaleDataUrl(
  url: string,
  maxDim: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('canvas 컨텍스트를 만들 수 없어요.'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve({ dataUrl: c.toDataURL('image/jpeg', 0.92), width: w, height: h })
    }
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'))
    img.src = url
  })
}

function toImageData(url: string, w: number, h: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('canvas 컨텍스트를 만들 수 없어요.'))
      ctx.drawImage(img, 0, 0, w, h)
      try {
        resolve(ctx.getImageData(0, 0, w, h))
      } catch {
        reject(new Error('이미지를 분석할 수 없어요 (CORS).'))
      }
    }
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'))
    img.src = url
  })
}

// 원본을 maxDim 이내로만 줄여 ImageData 로 (JPEG 재인코딩 없이 → 화질 유지)
function loadCapped(url: string, maxDim: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) return reject(new Error('canvas 컨텍스트를 만들 수 없어요.'))
      ctx.drawImage(img, 0, 0, w, h)
      try {
        resolve(ctx.getImageData(0, 0, w, h))
      } catch {
        reject(new Error('이미지를 분석할 수 없어요 (CORS).'))
      }
    }
    img.onerror = () => reject(new Error('이미지를 불러오지 못했어요.'))
    img.src = url
  })
}

export interface RegionalAdjustResult {
  output: ImageData // 영역별 보정 결과 (출력 해상도)
  orig: ImageData // 같은 해상도의 원본 (강도 블렌드용)
  globalOnly: boolean
  sharedCoverage: number
}

export interface RegionalAdjustOptions {
  modelId?: string
  onStatus?: (msg: string) => void
  onProgress?: ProgressFn
}

/**
 * myUrl(내 사진)을 targetUrl(목표 색감)에 맞춰 영역별로 보정한다.
 * 분할은 작게, 보정은 원본급 해상도에 적용해 화질을 유지한다.
 */
export async function runRegionalAdjust(
  myUrl: string,
  targetUrl: string,
  opts: RegionalAdjustOptions = {},
): Promise<RegionalAdjustResult> {
  const modelId = opts.modelId ?? DEFAULT_SEG_MODEL
  const status = opts.onStatus ?? (() => {})

  status('이미지 준비 중…')
  const [myD, refD] = await Promise.all([
    downscaleDataUrl(myUrl, SEG_DIM),
    downscaleDataUrl(targetUrl, SEG_DIM),
  ])

  status('AI 모델 준비 중… (처음 한 번만 다운로드)')
  const mySeg = await segmentImage(myD.dataUrl, modelId, opts.onProgress)
  status('사진 영역 분석 중…')
  const refSeg = await segmentImage(refD.dataUrl, modelId)

  status('영역별 색 보정 계산 중…')
  const mySegImg = await toImageData(myD.dataUrl, myD.width, myD.height)
  const refImg = await toImageData(refD.dataUrl, refD.width, refD.height)
  const myFullImg = await loadCapped(myUrl, OUTPUT_MAX_DIM)

  const refStatsByLabel = new Map<string, ImageStats>()
  for (const seg of refSeg.segments) {
    const s = statsForMask(refImg, seg.mask)
    if (s) refStatsByLabel.set(seg.label, s)
  }
  const refGlobalStats = analyzeStats(refImg)
  const globalRecipe: AdjustmentRecipe = await autoMatchRecipe(myD.dataUrl, refD.dataUrl)

  const { output, globalOnly, sharedCoverage } = regionalMatch(
    mySegImg,
    myFullImg,
    mySeg.segments,
    refStatsByLabel,
    refGlobalStats,
    globalRecipe,
  )

  return { output, orig: myFullImg, globalOnly, sharedCoverage }
}

// 원본 ↔ 보정본을 강도(pct)로 섞어 Blob 생성 (저장·업로드용)
export function blendToBlob(
  orig: ImageData,
  corrected: ImageData,
  pct: number,
  quality = 0.92,
): Promise<Blob> {
  const a = pct / 100
  const o = orig.data
  const c = corrected.data
  const out = new Uint8ClampedArray(o.length)
  for (let i = 0; i < o.length; i++) out[i] = o[i] + (c[i] - o[i]) * a
  const canvas = document.createElement('canvas')
  canvas.width = orig.width
  canvas.height = orig.height
  canvas.getContext('2d')!.putImageData(new ImageData(out, orig.width, orig.height), 0, 0)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 저장 실패'))), 'image/jpeg', quality),
  )
}

// 강도 블렌드를 dataURL 로 (미리보기용)
export function blendToUrl(orig: ImageData, corrected: ImageData, pct: number): string {
  const a = pct / 100
  const o = orig.data
  const c = corrected.data
  const out = new Uint8ClampedArray(o.length)
  for (let i = 0; i < o.length; i++) out[i] = o[i] + (c[i] - o[i]) * a
  const canvas = document.createElement('canvas')
  canvas.width = orig.width
  canvas.height = orig.height
  canvas.getContext('2d')!.putImageData(new ImageData(out, orig.width, orig.height), 0, 0)
  return canvas.toDataURL('image/jpeg', 0.92)
}
