// 온디바이스 객체 탐지의 "메인 스레드 쪽 클라이언트".
// 실제 추론은 detect.worker.ts(Web Worker)에서 돌아 UI를 막지 않는다.
// 여기서는 워커를 만들고, 프레임(ImageBitmap)을 보내고, 주요 피사체 bbox 만 받는다.

// 정규화(0~1) 좌표계의 주요 피사체 상자
export interface SubjectBox {
  cx: number
  cy: number
  w: number
  h: number
  label: string
  score: number
}

export type ProgressFn = (p: { status: string; progress?: number; file?: string }) => void

let worker: Worker | null = null
let reqId = 0
const pending = new Map<number, { resolve: (b: SubjectBox | null) => void; reject: (e: Error) => void }>()
let readyWaiters: { resolve: () => void; reject: (e: Error) => void }[] = []
let progressCb: ProgressFn | undefined

function ensureWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./detect.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data
    if (m?.type === 'progress') {
      progressCb?.(m.data)
      return
    }
    if (m?.type === 'ready') {
      const waiters = readyWaiters
      readyWaiters = []
      if (m.error) waiters.forEach((w) => w.reject(new Error(m.error)))
      else waiters.forEach((w) => w.resolve())
      return
    }
    if (typeof m?.id === 'number') {
      const p = pending.get(m.id)
      if (!p) return
      pending.delete(m.id)
      if (m.error) p.reject(new Error(m.error))
      else p.resolve((m.box as SubjectBox | null) ?? null)
    }
  }
  worker.onerror = (e) => {
    const err = new Error(e.message || '탐지 워커 오류')
    pending.forEach((p) => p.reject(err))
    pending.clear()
    readyWaiters.forEach((w) => w.reject(err))
    readyWaiters = []
  }
  return worker
}

/** 모델을 미리 로드하고 준비될 때까지 기다린다 (진행률 콜백 옵션). */
export function loadDetector(onProgress?: ProgressFn): Promise<void> {
  progressCb = onProgress
  const w = ensureWorker()
  return new Promise((resolve, reject) => {
    readyWaiters.push({ resolve, reject })
    w.postMessage({ type: 'load' })
  })
}

/** 프레임(ImageBitmap)에서 주요 피사체를 탐지. bitmap 은 워커로 transfer 되어 소비된다. */
export function detectMainSubject(bitmap: ImageBitmap): Promise<SubjectBox | null> {
  const w = ensureWorker()
  const id = ++reqId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ type: 'detect', id, bitmap }, [bitmap])
  })
}

/** 소스(video/canvas/image)를 긴 변 기준 long px 로 줄인 ImageBitmap 생성 (다운스케일). */
export async function bitmapFromSource(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  long: number,
): Promise<ImageBitmap> {
  const scale = Math.min(1, long / Math.max(srcW, srcH))
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))
  // 메인 스레드에서 작은 캔버스에 blit(값싼 연산) 후 bitmap 화 → 브라우저 호환성·크기 안정
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const cctx = canvas.getContext('2d')
  if (!cctx) throw new Error('canvas 컨텍스트를 만들 수 없어요.')
  cctx.drawImage(source, 0, 0, w, h)
  return createImageBitmap(canvas)
}
