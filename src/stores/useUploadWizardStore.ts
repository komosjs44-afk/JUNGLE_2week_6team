import { create } from 'zustand'
import type { AdjustmentRecipe, ExifData, PhotoLocation } from '@/types'

interface UploadWizardState {
  file: File | null
  previewUrl: string | null
  exif: ExifData | null
  exifStatus: 'idle' | 'analyzing' | 'found' | 'not_found'

  spotId: string | null
  photoLocation: PhotoLocation | null
  newSpotName: string

  direction: number | null
  creatorTip: string
  tags: string[]
  title: string

  // 보정 결과 실체(파일). AI 흐름에서 핸드오프 시점에 채워진다 — Preview/최종 업로드가 이 값을 우선한다.
  adjustedFile: File | null
  adjustedPreviewUrl: string | null
  // 이 사진에 적용된 보정값(있으면). 'ai' = 레퍼런스 기반 AI 보정, 'manual' = 업로드 중 직접 보정
  adjustmentRecipe: AdjustmentRecipe | null
  adjustmentSource: 'ai' | 'manual' | null
  adjustmentPublic: boolean

  setFile: (file: File, previewUrl: string) => void
  setExif: (exif: ExifData | null, status: UploadWizardState['exifStatus']) => void
  setSpotId: (id: string | null) => void
  setPhotoLocation: (location: PhotoLocation | null) => void
  setNewSpotName: (name: string) => void
  setDirection: (deg: number | null) => void
  setCreatorTip: (tip: string) => void
  toggleTag: (tag: string) => void
  setTitle: (title: string) => void
  setAdjustment: (recipe: AdjustmentRecipe | null, source: 'ai' | 'manual' | null) => void
  setAdjustmentValue: (key: keyof AdjustmentRecipe, value: number) => void
  /** AI 보정 결과(File+Preview+recipe)를 원자적으로 세팅 — AiAdjustPage 핸드오프 전용 */
  setAdjustedResult: (file: File, previewUrl: string, recipe: AdjustmentRecipe, source: 'ai' | 'manual') => void
  setAdjustmentPublic: (isPublic: boolean) => void
  reset: () => void
}

const initialState = {
  file: null,
  previewUrl: null,
  exif: null,
  exifStatus: 'idle' as const,
  spotId: null,
  photoLocation: null,
  newSpotName: '',
  direction: null,
  creatorTip: '',
  tags: [] as string[],
  title: '',
  adjustedFile: null as File | null,
  adjustedPreviewUrl: null as string | null,
  adjustmentRecipe: null as AdjustmentRecipe | null,
  adjustmentSource: null as 'ai' | 'manual' | null,
  adjustmentPublic: false,
}

function revoke(url: string | null) {
  if (url) URL.revokeObjectURL(url)
}

export const useUploadWizardStore = create<UploadWizardState>((set) => ({
  ...initialState,

  // A new photo invalidates any spot/location/adjustment resolved for the previous one —
  // otherwise stale state from an earlier photo in the same session leaks into this one.
  setFile: (file, previewUrl) =>
    set((state) => {
      revoke(state.adjustedPreviewUrl)
      return {
        file,
        previewUrl,
        spotId: null,
        photoLocation: null,
        newSpotName: '',
        adjustedFile: null,
        adjustedPreviewUrl: null,
        adjustmentRecipe: null,
        adjustmentSource: null,
        adjustmentPublic: false,
      }
    }),
  setExif: (exif, exifStatus) => set({ exif, exifStatus }),
  setSpotId: (spotId) => set({ spotId }),
  setPhotoLocation: (photoLocation) => set({ photoLocation }),
  setNewSpotName: (newSpotName) => set({ newSpotName }),
  setDirection: (direction) => set({ direction }),
  setCreatorTip: (creatorTip) => set({ creatorTip: creatorTip.slice(0, 200) }),
  toggleTag: (tag) =>
    set((state) => {
      if (state.tags.includes(tag)) return { tags: state.tags.filter((t) => t !== tag) }
      if (state.tags.length >= 5) return state
      return { tags: [...state.tags, tag] }
    }),
  setTitle: (title) => set({ title }),
  setAdjustment: (recipe, source) =>
    set((state) => {
      // "원본 그대로"로 되돌리는 경우(recipe=null) 보정 실체도 함께 정리
      if (!recipe) revoke(state.adjustedPreviewUrl)
      return {
        adjustmentRecipe: recipe,
        adjustmentSource: source,
        ...(recipe ? {} : { adjustedFile: null, adjustedPreviewUrl: null }),
      }
    }),
  setAdjustmentValue: (key, value) =>
    set((state) =>
      state.adjustmentRecipe ? { adjustmentRecipe: { ...state.adjustmentRecipe, [key]: value } } : state,
    ),
  setAdjustedResult: (adjustedFile, adjustedPreviewUrl, recipe, source) =>
    set((state) => {
      if (state.adjustedPreviewUrl && state.adjustedPreviewUrl !== adjustedPreviewUrl) {
        revoke(state.adjustedPreviewUrl)
      }
      return { adjustedFile, adjustedPreviewUrl, adjustmentRecipe: recipe, adjustmentSource: source }
    }),
  setAdjustmentPublic: (adjustmentPublic) => set({ adjustmentPublic }),
  reset: () =>
    set((state) => {
      revoke(state.adjustedPreviewUrl)
      return { ...initialState }
    }),
}))
