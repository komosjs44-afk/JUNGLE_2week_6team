import { useEffect, useRef, useState } from 'react'
import type { AdjustmentRecipe } from '@/types'
import { applyAdjustment } from '@/utils/imageAdjustment'

const PREVIEW_MAX_WIDTH = 640

interface AdjustmentPreviewProps {
  imageUrl: string
  recipe: AdjustmentRecipe
  showBefore?: boolean
}

export function AdjustmentPreview({ imageUrl, recipe, showBefore }: AdjustmentPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageDataRef = useRef<ImageData | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    originalImageDataRef.current = null

    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return

      const scale = Math.min(1, PREVIEW_MAX_WIDTH / img.naturalWidth)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      try {
        originalImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
        setReady(true)
      } catch {
        // Cross-origin image without CORS headers taints the canvas — fall back to a static draw.
        setReady(false)
      }
    }
    img.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current
    const original = originalImageDataRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !original) return

    const working = new ImageData(new Uint8ClampedArray(original.data), original.width, original.height)
    const result = showBefore ? working : applyAdjustment(working, recipe)
    ctx.putImageData(result, 0, 0)
  }, [ready, recipe, showBefore])

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-neutral-100">
      <canvas ref={canvasRef} className="h-full w-full object-cover" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-neutral-200" />}
      <span className="absolute top-3 left-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
        {showBefore ? 'Before' : 'After'}
      </span>
    </div>
  )
}
