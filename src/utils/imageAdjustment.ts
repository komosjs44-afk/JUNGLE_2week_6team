import type { AdjustmentRecipe } from '@/types'

function clamp255(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : value
}

// Pure pixel transform, kept separate from any UI/Canvas plumbing so it can be
// unit-tested or swapped for a WebGL/worker implementation later.
export function applyAdjustment(imageData: ImageData, recipe: AdjustmentRecipe): ImageData {
  const { data } = imageData
  const exposureFactor = Math.pow(2, recipe.exposure)
  const contrastFactor = 1 + recipe.contrast / 100
  const saturationFactor = 1 + recipe.saturation / 100
  const warmShift = (recipe.temperature / 1000) * 40
  const highlightAmount = recipe.highlights / 100
  const shadowAmount = recipe.shadows / 100

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] * exposureFactor
    let g = data[i + 1] * exposureFactor
    let b = data[i + 2] * exposureFactor

    r += warmShift
    b -= warmShift

    r = (r - 128) * contrastFactor + 128
    g = (g - 128) * contrastFactor + 128
    b = (b - 128) * contrastFactor + 128

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b
    if (luminance > 128) {
      const weight = ((luminance - 128) / 127) * highlightAmount * 40
      r += weight
      g += weight
      b += weight
    } else {
      const weight = ((128 - luminance) / 128) * shadowAmount * 40
      r += weight
      g += weight
      b += weight
    }

    const finalLuminance = 0.299 * r + 0.587 * g + 0.114 * b
    r = finalLuminance + (r - finalLuminance) * saturationFactor
    g = finalLuminance + (g - finalLuminance) * saturationFactor
    b = finalLuminance + (b - finalLuminance) * saturationFactor

    data[i] = clamp255(r)
    data[i + 1] = clamp255(g)
    data[i + 2] = clamp255(b)
  }

  return imageData
}
