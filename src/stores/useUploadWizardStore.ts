import { create } from 'zustand'
import type { ExifData } from '@/types'

export interface ManualLocation {
  lat: number
  lng: number
  address: string
}

interface UploadWizardState {
  file: File | null
  previewUrl: string | null
  exif: ExifData | null
  exifStatus: 'idle' | 'analyzing' | 'found' | 'not_found'

  spotId: string | null
  newSpotName: string
  manualLocation: ManualLocation | null

  direction: number | null
  creatorTip: string
  tags: string[]
  title: string

  setFile: (file: File, previewUrl: string) => void
  setExif: (exif: ExifData | null, status: UploadWizardState['exifStatus']) => void
  setSpotId: (id: string | null) => void
  setNewSpotName: (name: string) => void
  setManualLocation: (loc: ManualLocation | null) => void
  setDirection: (deg: number | null) => void
  setCreatorTip: (tip: string) => void
  toggleTag: (tag: string) => void
  setTitle: (title: string) => void
  reset: () => void
}

const initialState = {
  file: null,
  previewUrl: null,
  exif: null,
  exifStatus: 'idle' as const,
  spotId: null,
  newSpotName: '',
  manualLocation: null,
  direction: null,
  creatorTip: '',
  tags: [] as string[],
  title: '',
}

export const useUploadWizardStore = create<UploadWizardState>((set) => ({
  ...initialState,

  setFile: (file, previewUrl) => set({ file, previewUrl }),
  setExif: (exif, exifStatus) => set({ exif, exifStatus }),
  setSpotId: (spotId) => set({ spotId }),
  setNewSpotName: (newSpotName) => set({ newSpotName }),
  setManualLocation: (manualLocation) => set({ manualLocation }),
  setDirection: (direction) => set({ direction }),
  setCreatorTip: (creatorTip) => set({ creatorTip: creatorTip.slice(0, 200) }),
  toggleTag: (tag) =>
    set((state) => {
      if (state.tags.includes(tag)) return { tags: state.tags.filter((t) => t !== tag) }
      if (state.tags.length >= 5) return state
      return { tags: [...state.tags, tag] }
    }),
  setTitle: (title) => set({ title }),
  reset: () => set({ ...initialState }),
}))
