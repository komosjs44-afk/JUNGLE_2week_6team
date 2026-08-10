import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SaveState {
  savedReferenceIds: string[]
  savedSpotIds: string[]
  toggleReferenceSave: (id: string) => void
  toggleSpotSave: (id: string) => void
  isReferenceSaved: (id: string) => boolean
  isSpotSaved: (id: string) => boolean
}

export const useSaveStore = create<SaveState>()(
  persist(
    (set, get) => ({
      savedReferenceIds: ['ref-1'],
      savedSpotIds: ['spot-1'],

      toggleReferenceSave: (id) =>
        set((state) => ({
          savedReferenceIds: state.savedReferenceIds.includes(id)
            ? state.savedReferenceIds.filter((x) => x !== id)
            : [...state.savedReferenceIds, id],
        })),

      toggleSpotSave: (id) =>
        set((state) => ({
          savedSpotIds: state.savedSpotIds.includes(id)
            ? state.savedSpotIds.filter((x) => x !== id)
            : [...state.savedSpotIds, id],
        })),

      isReferenceSaved: (id) => get().savedReferenceIds.includes(id),
      isSpotSaved: (id) => get().savedSpotIds.includes(id),
    }),
    { name: 'reframe-saves' },
  ),
)
