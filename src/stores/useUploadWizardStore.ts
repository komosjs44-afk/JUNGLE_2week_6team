import { create } from 'zustand'
import type { ExifData, PhotoLocation } from '@/types'

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

  setFile: (file: File, previewUrl: string) => void
  setExif: (exif: ExifData | null, status: UploadWizardState['exifStatus']) => void
  setSpotId: (id: string | null) => void
  setPhotoLocation: (location: PhotoLocation | null) => void
  setNewSpotName: (name: string) => void
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
  photoLocation: null,
  newSpotName: '',
  direction: null,
  creatorTip: '',
  tags: [] as string[],
  title: '',
}

export const useUploadWizardStore = create<UploadWizardState>((set) => ({
  ...initialState,

  // A new photo invalidates any spot/location resolved for the previous one — otherwise a
  // stale auto-matched spotId (or photoLocation/newSpotName) from an earlier photo in the
  // same session leaks into this one.
  setFile: (file, previewUrl) =>
    set({ file, previewUrl, spotId: null, photoLocation: null, newSpotName: '' }),
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
  reset: () => set({ ...initialState }),
}))
