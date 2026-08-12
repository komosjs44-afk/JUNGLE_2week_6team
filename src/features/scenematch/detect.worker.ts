// 객체 탐지를 메인 스레드 밖(Web Worker)에서 실행 — 추론(WASM)이 UI를 얼리지 않게 한다.
// 메인 스레드는 프레임을 ImageBitmap 으로 만들어 transfer 하고, 결과(주요 피사체 bbox)만 돌려받는다.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false
const MODEL_ID = 'Xenova/yolos-tiny'
const ctx: any = self

let detectorPromise: Promise<any> | null = null
function getDetector() {
  if (!detectorPromise) {
    detectorPromise = pipeline('object-detection', MODEL_ID, {
      progress_callback: (p: any) => ctx.postMessage({ type: 'progress', data: p }),
    })
  }
  return detectorPromise
}

function norm(v: number): number {
  return v > 1.5 ? v / 100 : v
}

ctx.onmessage = async (e: MessageEvent) => {
  const msg = e.data
  if (msg?.type === 'load') {
    try {
      await getDetector()
      ctx.postMessage({ type: 'ready' })
    } catch (err: any) {
      ctx.postMessage({ type: 'ready', error: err?.message ?? String(err) })
    }
    return
  }
  if (msg?.type === 'detect') {
    const { id, bitmap } = msg as { id: number; bitmap: ImageBitmap }
    try {
      const detector = await getDetector()
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const c2d = canvas.getContext('2d')
      c2d?.drawImage(bitmap, 0, 0)
      bitmap.close?.()
      const out = (await detector(canvas, { threshold: 0.25, percentage: true })) as Array<{
        score: number
        label: string
        box: { xmin: number; ymin: number; xmax: number; ymax: number }
      }>
      let best: any = null
      let bestArea = 0
      for (const o of out) {
        const xmin = norm(o.box.xmin)
        const ymin = norm(o.box.ymin)
        const xmax = norm(o.box.xmax)
        const ymax = norm(o.box.ymax)
        const w = Math.max(0, xmax - xmin)
        const h = Math.max(0, ymax - ymin)
        const area = w * h
        if (area > bestArea && area < 0.92) {
          bestArea = area
          best = { cx: xmin + w / 2, cy: ymin + h / 2, w, h, label: o.label, score: o.score }
        }
      }
      ctx.postMessage({ id, box: best })
    } catch (err: any) {
      ctx.postMessage({ id, error: err?.message ?? String(err) })
    }
  }
}
