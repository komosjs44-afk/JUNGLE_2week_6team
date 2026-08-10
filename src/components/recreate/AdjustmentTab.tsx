import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import type { AdjustmentRecipe, Reference } from '@/types'
import { ADJUSTMENT_RANGES, DEFAULT_ADJUSTMENT_RECIPE } from '@/types'
import { useAdjustmentStore } from '@/stores'
import { AdjustmentPreview } from '@/components/adjustment/AdjustmentPreview'
import { Slider } from '@/components/common/Slider'
import { Button } from '@/components/common/Button'

const LABELS: Record<keyof AdjustmentRecipe, string> = {
  exposure: 'Exposure',
  contrast: 'Contrast',
  highlights: 'Highlights',
  shadows: 'Shadows',
  saturation: 'Saturation',
  temperature: 'Temperature',
}

export function AdjustmentTab({ reference }: { reference: Reference }) {
  const { recipe, setValue, reset } = useAdjustmentStore()
  const [showBefore, setShowBefore] = useState(false)

  useEffect(() => {
    reset(reference.adjustment ?? DEFAULT_ADJUSTMENT_RECIPE)
    // Load this reference's saved recipe (or the default) whenever the target reference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference.id])

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <AdjustmentPreview imageUrl={reference.imageUrl} recipe={recipe} showBefore={showBefore} />

      <button
        type="button"
        onTouchStart={() => setShowBefore(true)}
        onTouchEnd={() => setShowBefore(false)}
        onMouseDown={() => setShowBefore(true)}
        onMouseUp={() => setShowBefore(false)}
        onMouseLeave={() => setShowBefore(false)}
        className="min-h-[44px] rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 active:bg-neutral-50"
      >
        누르고 있으면 원본과 비교돼요
      </button>

      <div className="flex flex-col gap-4">
        {(Object.keys(LABELS) as (keyof AdjustmentRecipe)[]).map((key) => (
          <Slider
            key={key}
            label={LABELS[key]}
            value={recipe[key]}
            min={ADJUSTMENT_RANGES[key].min}
            max={ADJUSTMENT_RANGES[key].max}
            step={ADJUSTMENT_RANGES[key].step}
            onChange={(v) => setValue(key, v)}
          />
        ))}
      </div>

      <Button
        variant="secondary"
        fullWidth
        icon={<RotateCcw size={16} />}
        onClick={() => reset(reference.adjustment ?? DEFAULT_ADJUSTMENT_RECIPE)}
      >
        원본 레시피로 초기화
      </Button>
    </div>
  )
}
