export interface AdjustmentRecipe {
  exposure: number
  contrast: number
  highlights: number
  shadows: number
  saturation: number
  temperature: number
}

export const DEFAULT_ADJUSTMENT_RECIPE: AdjustmentRecipe = {
  exposure: 0.3,
  contrast: 10,
  highlights: -15,
  shadows: 20,
  saturation: 5,
  temperature: 400,
}

export const ADJUSTMENT_RANGES: Record<keyof AdjustmentRecipe, { min: number; max: number; step: number }> = {
  exposure: { min: -2, max: 2, step: 0.1 },
  contrast: { min: -50, max: 50, step: 1 },
  highlights: { min: -100, max: 100, step: 1 },
  shadows: { min: -100, max: 100, step: 1 },
  saturation: { min: -50, max: 50, step: 1 },
  temperature: { min: -1000, max: 1000, step: 10 },
}
