import type { ReferenceRepository, DiscoverTab } from '../types'
import type { Reference } from '@/types'
import { MOCK_REFERENCES, getUserById, getSpotById } from '@/mocks'
import { mockDelay } from './delay'

const store: Reference[] = [...MOCK_REFERENCES]

function pseudoDistanceRank(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997
  return hash
}

function sortForTab(list: Reference[], tab?: DiscoverTab): Reference[] {
  const copy = [...list]
  switch (tab) {
    case 'popular':
      return copy.sort((a, b) => b.likeCount - a.likeCount)
    case 'new':
      return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    case 'nearby':
      return copy.sort((a, b) => pseudoDistanceRank(a.id) - pseudoDistanceRank(b.id))
    case 'recommended':
    default:
      return copy.sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
  }
}

export const mockReferenceRepository: ReferenceRepository = {
  async list(tab) {
    return mockDelay(sortForTab(store, tab))
  },

  async getById(id) {
    return mockDelay(store.find((r) => r.id === id) ?? null)
  },

  async getBySpotId(spotId) {
    return mockDelay(store.filter((r) => r.spotId === spotId))
  },

  async create(input) {
    const creator = getUserById(input.userId)
    const spot = input.spotId ? getSpotById(input.spotId) : undefined
    if (!creator) throw new Error('알 수 없는 사용자예요.')
    if (!spot) throw new Error('알 수 없는 장소예요.')

    const newReference: Reference = {
      id: `ref-new-${Date.now()}`,
      userId: input.userId,
      spotId: spot.id,
      title: input.title,
      imageUrl: input.imageUrl,
      creator,
      spot,
      tags: input.tags,
      shooting: {
        shotAt: input.exif?.shotAt,
        direction: input.direction,
        focalLength: input.exif?.focalLength,
        creatorTip: input.creatorTip,
      },
      exif: input.exif,
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    }

    store.unshift(newReference)
    return mockDelay(newReference, 500)
  },
}
