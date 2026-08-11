import type { AdjustmentRecipe } from '@/types'
import { ADJUSTMENT_LABELS, ADJUSTMENT_RANGES } from '@/types'
import { Slider } from '@/components/common/Slider'

interface AdjustmentSlidersProps {
  recipe: AdjustmentRecipe
  onChange: (key: keyof AdjustmentRecipe, value: number) => void
}

export function AdjustmentSliders({ recipe, onChange }: AdjustmentSlidersProps) {
  return (
    <div className="flex flex-col gap-4">
      {(Object.keys(ADJUSTMENT_LABELS) as (keyof AdjustmentRecipe)[]).map((key) => (
        <Slider
          key={key}
          label={ADJUSTMENT_LABELS[key]}
          value={recipe[key]}
          min={ADJUSTMENT_RANGES[key].min}
          max={ADJUSTMENT_RANGES[key].max}
          step={ADJUSTMENT_RANGES[key].step}
          onChange={(v) => onChange(key, v)}
        />
      ))}
    </div>
  )
}
