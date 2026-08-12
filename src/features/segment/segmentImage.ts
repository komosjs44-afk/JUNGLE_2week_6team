// SegFormer(ADE20K) 의미 분할 — 브라우저에서 transformers.js 로 직접 실행.
// POC 목적: 모델 로드/추론 시간과 검출 클래스(하늘·건물·나무·인물 등)를 실측한다.
// 무거운 라이브러리라 반드시 동적 import 로 코드 분할 → 이 화면에 들어올 때만 로드된다.

// ADE20K SegFormer (하늘·건물·나무·인물·물·잔디 등 150클래스). 위→아래로 정확도↑ 속도↓ 용량↑.
export const SEG_MODELS = [
  { id: 'Xenova/segformer-b0-finetuned-ade-512-512', label: 'b0 (가장 빠름·작음)' },
  { id: 'Xenova/segformer-b2-finetuned-ade-512-512', label: 'b2 (균형)' },
  { id: 'Xenova/segformer-b5-finetuned-ade-640-640', label: 'b5 (가장 정확·느림·큼)' },
] as const

export const DEFAULT_SEG_MODEL = SEG_MODELS[0].id

export interface Segment {
  label: string
  score: number | null
  mask: Uint8Array // 원본 크기, 값 0 또는 255 (채널 1)
  width: number
  height: number
  coverage: number // 이 클래스가 차지하는 픽셀 비율 0~1
}

export interface SegmentResult {
  segments: Segment[]
  msLoad: number // 모델 준비(최초 1회 다운로드 포함) 시간
  msInfer: number // 추론 시간
}

export type ProgressFn = (p: { status: string; file?: string; progress?: number }) => void

// 모델별로 파이프라인을 캐시 (모델을 바꾸면 새로 로드)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const segmenters = new Map<string, Promise<any>>()

async function getSegmenter(modelId: string, onProgress?: ProgressFn) {
  let p = segmenters.get(modelId)
  if (!p) {
    p = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      // 로컬 모델을 먼저 찾다 404 나는 잡음을 없애고 HF 허브에서 바로 받게 한다
      env.allowLocalModels = false
      return pipeline('image-segmentation', modelId, {
        progress_callback: onProgress as never,
      })
    })()
    segmenters.set(modelId, p)
  }
  return p
}

export async function segmentImage(
  url: string,
  modelId: string = DEFAULT_SEG_MODEL,
  onProgress?: ProgressFn,
): Promise<SegmentResult> {
  const t0 = performance.now()
  const segmenter = await getSegmenter(modelId, onProgress)
  const t1 = performance.now()

  // subtask 를 명시하면 transformers.js v4 버그로 후처리 함수가 문자열로 잡혀 "fn is not a function"이 난다.
  // 옵션을 비우면 자동 감지가 image_processor.post_process_semantic_segmentation 을 함수로 바인딩한다(SegFormer=semantic).
  const output = await segmenter(url)
  const t2 = performance.now()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segments: Segment[] = (output as any[]).map((s) => {
    const data = s.mask.data as Uint8Array
    let on = 0
    for (let i = 0; i < data.length; i++) if (data[i] > 127) on++
    return {
      label: s.label ?? '?',
      score: s.score ?? null,
      mask: data,
      width: s.mask.width as number,
      height: s.mask.height as number,
      coverage: data.length ? on / data.length : 0,
    }
  })
  // 큰 영역부터 보기 좋게 정렬
  segments.sort((a, b) => b.coverage - a.coverage)

  return { segments, msLoad: t1 - t0, msInfer: t2 - t1 }
}
