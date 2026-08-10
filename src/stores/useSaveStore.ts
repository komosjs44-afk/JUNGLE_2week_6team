import { create } from 'zustand'
import { saveService } from '@/services'
import { useAuthStore } from './useAuthStore'

interface SaveState {
  savedReferenceIds: string[]
  savedSpotIds: string[]
  load: () => Promise<void>
  clear: () => void
  toggleReferenceSave: (id: string) => void
  toggleSpotSave: (id: string) => void
  isReferenceSaved: (id: string) => boolean
  isSpotSaved: (id: string) => boolean
}

function currentUserId(): string | undefined {
  return useAuthStore.getState().user?.id
}

export const useSaveStore = create<SaveState>()((set, get) => ({
  savedReferenceIds: [],
  savedSpotIds: [],

  // 로그인 사용자의 저장 목록을 서버에서 불러옴 (App 시작·로그인 시 호출)
  load: async () => {
    const userId = currentUserId()
    if (!userId) {
      set({ savedReferenceIds: [], savedSpotIds: [] })
      return
    }
    const [refs, spots] = await Promise.all([
      saveService.listReferenceIds(userId),
      saveService.listSpotIds(userId),
    ])
    set({ savedReferenceIds: refs, savedSpotIds: spots })
  },

  clear: () => set({ savedReferenceIds: [], savedSpotIds: [] }),

  // 낙관적 업데이트: UI 먼저 바꾸고 서버 반영, 실패 시 롤백
  toggleReferenceSave: (id) => {
    const userId = currentUserId()
    if (!userId) return
    const wasSaved = get().savedReferenceIds.includes(id)
    set((s) => ({
      savedReferenceIds: wasSaved
        ? s.savedReferenceIds.filter((x) => x !== id)
        : [...s.savedReferenceIds, id],
    }))
    const op = wasSaved
      ? saveService.removeReference(userId, id)
      : saveService.addReference(userId, id)
    void op.catch(() => {
      set((s) => ({
        savedReferenceIds: wasSaved
          ? [...s.savedReferenceIds, id]
          : s.savedReferenceIds.filter((x) => x !== id),
      }))
    })
  },

  toggleSpotSave: (id) => {
    const userId = currentUserId()
    if (!userId) return
    const wasSaved = get().savedSpotIds.includes(id)
    set((s) => ({
      savedSpotIds: wasSaved
        ? s.savedSpotIds.filter((x) => x !== id)
        : [...s.savedSpotIds, id],
    }))
    const op = wasSaved ? saveService.removeSpot(userId, id) : saveService.addSpot(userId, id)
    void op.catch(() => {
      set((s) => ({
        savedSpotIds: wasSaved
          ? [...s.savedSpotIds, id]
          : s.savedSpotIds.filter((x) => x !== id),
      }))
    })
  },

  isReferenceSaved: (id) => get().savedReferenceIds.includes(id),
  isSpotSaved: (id) => get().savedSpotIds.includes(id),
}))
