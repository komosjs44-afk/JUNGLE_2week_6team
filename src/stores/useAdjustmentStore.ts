import { create } from 'zustand'
import type { AdjustmentRecipe } from '@/types'
import { DEFAULT_ADJUSTMENT_RECIPE } from '@/types'

interface AdjustmentState {
  recipe: AdjustmentRecipe
  setValue: (key: keyof AdjustmentRecipe, value: number) => void
  reset: (recipe?: AdjustmentRecipe) => void
}

export const useAdjustmentStore = create<AdjustmentState>((set) => ({
  recipe: { ...DEFAULT_ADJUSTMENT_RECIPE },

  setValue: (key, value) =>
    set((state) => ({ recipe: { ...state.recipe, [key]: value } })),

  reset: (recipe) => set({ recipe: recipe ? { ...recipe } : { ...DEFAULT_ADJUSTMENT_RECIPE } }),
}))
